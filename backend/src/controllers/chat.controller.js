import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import User from "../models/Users.js";
import {
  createDirectChannel,
  generateStreamToken,
  isStreamConfigured,
} from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const token = generateStreamToken(req.user._id.toString());

    return res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const getFriend = async (currentUser, targetUserId) => {
  if (!mongoose.isValidObjectId(targetUserId)) return null;
  const isFriend = currentUser.friends.some(
    (friendId) => String(friendId) === String(targetUserId),
  );
  if (!isFriend) return null;
  return User.findById(targetUserId)
    .select("fullName profilePic nativeLanguage learningLanguage")
    .lean();
};

export async function getDirectConversation(req, res) {
  try {
    const targetUser = await getFriend(req.user, req.params.userId);
    if (!targetUser) {
      return res.status(403).json({ message: "You can only message your connections" });
    }
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }

    const memberIds = [String(req.user._id), String(targetUser._id)].sort();
    const channelId = memberIds.join("-");
    await createDirectChannel(channelId, memberIds);
    return res.status(200).json({ channelId, targetUser });
  } catch (error) {
    console.error("Error creating direct conversation", error.message);
    return res.status(500).json({ message: "Could not open this conversation" });
  }
}

export async function authorizeDirectCall(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const targetUser = await getFriend(req.user, req.params.userId);
    if (!targetUser) {
      return res.status(403).json({ message: "You can only call your connections" });
    }
    return res.status(200).json({
      callId: randomUUID(),
      callType: process.env.STREAM_CALL_TYPE || "default",
      targetUser,
    });
  } catch (error) {
    console.error("Error authorizing direct call", error.message);
    return res.status(500).json({ message: "Could not start this call" });
  }
}
