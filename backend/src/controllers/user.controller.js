import mongoose from "mongoose";
import User from "../models/Users.js";
import FriendRequest from "../models/FriendRequest.js";
import Report from "../models/Report.js";
import {
  cleanText,
  escapeRegex,
  parsePositiveInteger,
} from "../utils/validation.js";

const publicProfileFields =
  "fullName profilePic nativeLanguage learningLanguage location bio";

export async function getRecommendedUsers(req, res) {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 10_000);
    const limit = parsePositiveInteger(req.query.limit, 12, 50);
    const search = cleanText(req.query.search, 80);
    const query = {
      _id: { $ne: req.user._id, $nin: [...req.user.friends, ...req.user.blocked] },
      blocked: { $ne: req.user._id },
      isOnboarding: true,
    };

    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { fullName: pattern },
        { nativeLanguage: pattern },
        { learningLanguage: pattern },
        { location: pattern },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select(publicProfileFields)
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("friends")
      .populate("friends", publicProfileFields)
      .lean();
    return res.status(200).json(user?.friends || []);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user._id;
    const recipientId = req.params.id;
    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(myId) === recipientId) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const recipient = await User.findById(recipientId).select("friends blocked");
    if (!recipient) return res.status(404).json({ message: "User not found" });
    if (recipient.friends.some((id) => id.equals(myId))) {
      return res.status(409).json({ message: "You are already connected" });
    }
    if (
      recipient.blocked.some((id) => id.equals(myId)) ||
      req.user.blocked.some((id) => id.equals(recipientId))
    ) {
      return res.status(403).json({ message: "You can't send a request to this user" });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });
    if (existingRequest) {
      return res.status(409).json({
        message:
          existingRequest.status === "accepted"
            ? "You are already connected"
            : "A connection request already exists",
      });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });
    return res.status(201).json(friendRequest);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A connection request already exists" });
    }
    console.error("Error in sendFriendRequest controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      status: "pending",
    });
    if (!friendRequest) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    friendRequest.status = "accepted";
    await Promise.all([
      friendRequest.save(),
      User.findByIdAndUpdate(friendRequest.sender, {
        $addToSet: { friends: friendRequest.recipient },
      }),
      User.findByIdAndUpdate(friendRequest.recipient, {
        $addToSet: { friends: friendRequest.sender },
      }),
    ]);

    return res.status(200).json({ message: "Connection accepted" });
  } catch (error) {
    console.error("Error in acceptFriendRequest controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const [incomingReqs, acceptedReqs] = await Promise.all([
      FriendRequest.find({ recipient: req.user._id, status: "pending" })
        .populate("sender", publicProfileFields)
        .sort({ createdAt: -1 })
        .lean(),
      FriendRequest.find({ sender: req.user._id, status: "accepted" })
        .populate("recipient", publicProfileFields)
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
    ]);
    return res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.error("Error in getFriendRequests controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user._id,
      status: "pending",
    })
      .populate("recipient", publicProfileFields)
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(outgoingRequests);
  } catch (error) {
    console.error("Error in getOutgoingFriendReqs controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function blockUser(req, res) {
  try {
    const myId = req.user._id;
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(myId) === targetId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    await Promise.all([
      User.findByIdAndUpdate(myId, {
        $addToSet: { blocked: targetId },
        $pull: { friends: targetId },
      }),
      User.findByIdAndUpdate(targetId, { $pull: { friends: myId } }),
      FriendRequest.deleteMany({
        $or: [
          { sender: myId, recipient: targetId },
          { sender: targetId, recipient: myId },
        ],
      }),
    ]);

    return res.status(200).json({ message: "User blocked" });
  } catch (error) {
    console.error("Error in blockUser controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unblockUser(req, res) {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    await User.findByIdAndUpdate(req.user._id, { $pull: { blocked: targetId } });
    return res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    console.error("Error in unblockUser controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getBlockedUsers(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("blocked")
      .populate("blocked", publicProfileFields)
      .lean();
    return res.status(200).json(user?.blocked || []);
  } catch (error) {
    console.error("Error in getBlockedUsers controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function reportUser(req, res) {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (String(req.user._id) === targetId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }
    const reason = cleanText(req.body?.reason, 500);
    if (!reason) {
      return res.status(400).json({ message: "Tell us what happened" });
    }

    const targetExists = await User.exists({ _id: targetId });
    if (!targetExists) return res.status(404).json({ message: "User not found" });

    await Report.create({ reporter: req.user._id, reportedUser: targetId, reason });
    return res.status(201).json({ message: "Report submitted" });
  } catch (error) {
    console.error("Error in reportUser controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
