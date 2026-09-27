import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import User from "../models/Users.js";
import {
  createDirectChannel,
  createGroupChannel,
  generateStreamToken,
  getGroupChannel,
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
    await createDirectChannel(channelId, memberIds, req.user._id);
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

const isGroupCreator = (channel, userId) => {
  const creatorId = channel.data?.created_by?.id || channel.data?.created_by_id;
  return Boolean(creatorId) && String(creatorId) === String(userId);
};

export async function getGroupInfo(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const channel = await getGroupChannel(req.params.channelId);
    if (!channel) return res.status(404).json({ message: "Group not found" });

    const memberIds = Object.keys(channel.state.members || {});
    if (!memberIds.includes(String(req.user._id))) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const members = await User.find({ _id: { $in: memberIds } })
      .select("fullName profilePic nativeLanguage learningLanguage")
      .lean();
    const creatorId = channel.data?.created_by?.id || channel.data?.created_by_id;

    return res.status(200).json({
      channelId: channel.id,
      name: channel.data?.name || "Group",
      creatorId,
      isCreator: isGroupCreator(channel, req.user._id),
      members,
    });
  } catch (error) {
    console.error("Error fetching group info", error.message);
    return res.status(500).json({ message: "Could not load group info" });
  }
}

export async function addGroupMembers(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const channel = await getGroupChannel(req.params.channelId);
    if (!channel) return res.status(404).json({ message: "Group not found" });
    if (!isGroupCreator(channel, req.user._id)) {
      return res.status(403).json({ message: "Only the group creator can add members" });
    }

    const rawMemberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const memberIds = [...new Set(rawMemberIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );
    if (!memberIds.length) {
      return res.status(400).json({ message: "Pick at least one friend to add" });
    }

    const friendIds = new Set(req.user.friends.map(String));
    const allFriends = memberIds.every((id) => friendIds.has(id));
    if (!allFriends) {
      return res.status(403).json({ message: "You can only add your connections to a group" });
    }

    const existingMemberIds = new Set(Object.keys(channel.state.members || {}));
    const newMemberIds = memberIds.filter((id) => !existingMemberIds.has(id));
    if (!newMemberIds.length) {
      return res.status(200).json({ message: "Members already in the group" });
    }
    if (existingMemberIds.size + newMemberIds.length > MAX_GROUP_MEMBERS + 1) {
      return res.status(400).json({ message: "A group can have at most 50 other members" });
    }

    await channel.addMembers(newMemberIds);
    return res.status(200).json({ message: "Members added" });
  } catch (error) {
    console.error("Error adding group members", error.message);
    return res.status(500).json({ message: "Could not add members" });
  }
}

export async function removeGroupMember(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const channel = await getGroupChannel(req.params.channelId);
    if (!channel) return res.status(404).json({ message: "Group not found" });

    const targetId = req.params.userId;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const isSelf = String(req.user._id) === String(targetId);
    const requesterIsCreator = isGroupCreator(channel, req.user._id);
    if (!isSelf && !requesterIsCreator) {
      return res.status(403).json({ message: "Only the group creator can remove members" });
    }
    if (isSelf && isGroupCreator(channel, targetId)) {
      return res
        .status(400)
        .json({ message: "The group creator can't leave the group" });
    }

    await channel.removeMembers([targetId]);
    return res.status(200).json({ message: isSelf ? "Left the group" : "Member removed" });
  } catch (error) {
    console.error("Error removing group member", error.message);
    return res.status(500).json({ message: "Could not remove this member" });
  }
}

export async function renameGroup(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }
    const channel = await getGroupChannel(req.params.channelId);
    if (!channel) return res.status(404).json({ message: "Group not found" });
    if (!isGroupCreator(channel, req.user._id)) {
      return res.status(403).json({ message: "Only the group creator can rename the group" });
    }

    const name = cleanText(req.body?.name, 80);
    if (!name) {
      return res.status(400).json({ message: "A group name is required" });
    }

    await channel.updatePartial({ set: { name } });
    return res.status(200).json({ message: "Group renamed", name });
  } catch (error) {
    console.error("Error renaming group", error.message);
    return res.status(500).json({ message: "Could not rename this group" });
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
