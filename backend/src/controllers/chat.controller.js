import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import User from "../models/Users.js";
import {
  createDirectChannel,
  createGroupChannel,
  generateStreamToken,
  isStreamConfigured,
} from "../lib/stream.js";
import { cleanText } from "../utils/validation.js";

const MIN_GROUP_MEMBERS = 2;
const MAX_GROUP_MEMBERS = 50;

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

export async function createGroup(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }

    const name = cleanText(req.body?.name, 80);
    if (!name) {
      return res.status(400).json({ message: "A group name is required" });
    }

    const rawMemberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const memberIds = [...new Set(rawMemberIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    if (memberIds.length < MIN_GROUP_MEMBERS) {
      return res.status(400).json({ message: "Pick at least two friends to start a group" });
    }
    if (memberIds.length > MAX_GROUP_MEMBERS) {
      return res.status(400).json({ message: "A group can have at most 50 other members" });
    }

    const friendIds = new Set(req.user.friends.map(String));
    const allFriends = memberIds.every((id) => friendIds.has(id));
    if (!allFriends) {
      return res.status(403).json({ message: "You can only add your connections to a group" });
    }

    const channelId = `group-${randomUUID()}`;
    const allMemberIds = [String(req.user._id), ...memberIds];
    await createGroupChannel(channelId, allMemberIds, { name, createdBy: req.user._id });

    return res.status(201).json({ channelId, name });
  } catch (error) {
    console.error("Error creating group chat", error.message);
    return res.status(500).json({ message: "Could not create this group" });
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
