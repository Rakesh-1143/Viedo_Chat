import mongoose from "mongoose";
import Call, { TERMINAL_CALL_STATUSES } from "../models/Call.js";
import User from "../models/Users.js";
import { getGroupChannel } from "../lib/stream.js";
import { sendPushToUser } from "../lib/push.js";

const UPDATABLE_STATUSES = ["accepted", "completed", "rejected", "canceled", "missed"];
const MAX_CALL_ID_LENGTH = 128;
const publicProfileFields = "fullName profilePic nativeLanguage learningLanguage";

async function logGroupCallStart(req, res, { callId, channelId, mode }) {
  if (typeof channelId !== "string" || !channelId.startsWith("group-")) {
    return res.status(400).json({ message: "Invalid group channel" });
  }

  const channel = await getGroupChannel(channelId);
  if (!channel) return res.status(404).json({ message: "Group not found" });

  const memberIds = Object.keys(channel.state.members || {});
  if (!memberIds.includes(String(req.user._id))) {
    return res.status(403).json({ message: "You are not a member of this group" });
  }

  const call = await Call.findOneAndUpdate(
    { callId },
    {
      $setOnInsert: {
        callId,
        channelId,
        mode: mode === "audio" ? "audio" : "video",
        caller: req.user._id,
        isGroupCall: true,
        groupName: channel.data?.name || "Group",
        participants: memberIds.filter((id) => mongoose.isValidObjectId(id)),
        status: "ringing",
        startedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  memberIds
    .filter((id) => id !== String(req.user._id))
    .forEach((id) => {
      sendPushToUser(id, {
        title: `${req.user.fullName} started a ${mode === "audio" ? "call" : "video call"}`,
        body: `In ${channel.data?.name || "a group"}`,
        url: `/call/${callId}`,
      }).catch((error) => console.error("Failed to push group call notice", error.message));
    });

  return res.status(201).json(call);
}

export async function logCallStart(req, res) {
  try {
    const { callId, channelId, calleeId, mode, isGroupCall } = req.body || {};

    if (typeof callId !== "string" || !callId.trim() || callId.length > MAX_CALL_ID_LENGTH) {
      return res.status(400).json({ message: "A valid call ID is required" });
    }

    if (isGroupCall) {
      return await logGroupCallStart(req, res, { callId, channelId, mode });
    }

    if (!mongoose.isValidObjectId(calleeId)) {
      return res.status(400).json({ message: "Invalid callee ID" });
    }
    const isFriend = req.user.friends.some((id) => String(id) === String(calleeId));
    if (!isFriend) {
      return res.status(403).json({ message: "You can only call your connections" });
    }

    const callee = await User.findById(calleeId).select("_id");
    if (!callee) return res.status(404).json({ message: "User not found" });

    const call = await Call.findOneAndUpdate(
      { callId },
      {
        $setOnInsert: {
          callId,
          channelId: typeof channelId === "string" ? channelId.slice(0, 200) : "",
          mode: mode === "audio" ? "audio" : "video",
          caller: req.user._id,
          callee: calleeId,
          status: "ringing",
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    sendPushToUser(calleeId, {
      title: `${req.user.fullName} is calling you`,
      body: mode === "audio" ? "Incoming audio call" : "Incoming video call",
      url: `/call/${callId}`,
    }).catch((error) => console.error("Failed to push call notice", error.message));

    return res.status(201).json(call);
  } catch (error) {
    console.error("Error in logCallStart controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateCallStatus(req, res) {
  try {
    const { callId } = req.params;
    const { status, durationSeconds } = req.body || {};

    if (!UPDATABLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid call status" });
    }

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const isParticipant =
      String(call.caller) === String(req.user._id) ||
      (call.callee && String(call.callee) === String(req.user._id)) ||
      (call.isGroupCall &&
        call.participants.some((id) => String(id) === String(req.user._id)));
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not part of this call" });
    }

    if (TERMINAL_CALL_STATUSES.includes(call.status)) {
      return res.status(200).json(call);
    }

    call.status = status;
    if (status === "accepted") {
      call.connectedAt = new Date();
    } else if (TERMINAL_CALL_STATUSES.includes(status)) {
      call.endedAt = new Date();
      const providedDuration = Number(durationSeconds);
      call.durationSeconds =
        Number.isFinite(providedDuration) && providedDuration > 0
          ? Math.round(providedDuration)
          : call.connectedAt
            ? Math.max(0, Math.round((Date.now() - call.connectedAt.getTime()) / 1000))
            : 0;
    }

    await call.save();
    return res.status(200).json(call);
  } catch (error) {
    console.error("Error in updateCallStatus controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCallHistory(req, res) {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user._id },
        { callee: req.user._id },
        { participants: req.user._id },
      ],
    })
      .sort({ startedAt: -1 })
      .limit(50)
      .populate("caller", publicProfileFields)
      .populate("callee", publicProfileFields)
      .lean();

    const history = calls
      .filter((call) => call.caller && (call.isGroupCall || call.callee))
      .map((call) => {
        const isOutgoing = String(call.caller._id) === String(req.user._id);
        return {
          _id: call._id,
          callId: call.callId,
          mode: call.mode,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          durationSeconds: call.durationSeconds,
          direction: isOutgoing ? "outgoing" : "incoming",
          isGroupCall: Boolean(call.isGroupCall),
          groupName: call.isGroupCall ? call.groupName : undefined,
          channelId: call.isGroupCall ? call.channelId : undefined,
          counterpart: call.isGroupCall ? null : isOutgoing ? call.callee : call.caller,
        };
      });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error in getCallHistory controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
