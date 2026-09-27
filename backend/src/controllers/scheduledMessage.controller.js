import mongoose from "mongoose";
import ScheduledMessage from "../models/ScheduledMessage.js";
import { getMemberChannel, isStreamConfigured } from "../lib/stream.js";
import { cleanText } from "../utils/validation.js";

const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_SCHEDULE_AHEAD_MS = 60 * 1000;

export async function createScheduledMessage(req, res) {
  try {
    if (!isStreamConfigured()) {
      return res.status(503).json({ message: "Real-time service is not configured" });
    }

    const { channelId, sendAt } = req.body || {};
    if (typeof channelId !== "string" || !channelId.trim()) {
      return res.status(400).json({ message: "A channel is required" });
    }

    const text = cleanText(req.body?.text, 5_000);
    if (!text) {
      return res.status(400).json({ message: "A message is required" });
    }

    const sendAtDate = new Date(sendAt);
    if (Number.isNaN(sendAtDate.getTime())) {
      return res.status(400).json({ message: "A valid send time is required" });
    }
    const delta = sendAtDate.getTime() - Date.now();
    if (delta < MIN_SCHEDULE_AHEAD_MS) {
      return res.status(400).json({ message: "Choose a time at least a minute from now" });
    }
    if (delta > MAX_SCHEDULE_AHEAD_MS) {
      return res.status(400).json({ message: "Messages can be scheduled at most 30 days ahead" });
    }

    const channel = await getMemberChannel(channelId, req.user._id);
    if (!channel) {
      return res.status(403).json({ message: "You are not part of this conversation" });
    }

    const scheduledMessage = await ScheduledMessage.create({
      sender: req.user._id,
      channelId,
      text,
      sendAt: sendAtDate,
    });

    return res.status(201).json(scheduledMessage);
  } catch (error) {
    console.error("Error creating scheduled message", error.message);
    return res.status(500).json({ message: "Could not schedule this message" });
  }
}

export async function getScheduledMessages(req, res) {
  try {
    const { channelId } = req.query;
    if (typeof channelId !== "string" || !channelId.trim()) {
      return res.status(400).json({ message: "A channel is required" });
    }

    const messages = await ScheduledMessage.find({
      sender: req.user._id,
      channelId,
      status: "pending",
    })
      .sort({ sendAt: 1 })
      .lean();

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching scheduled messages", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function cancelScheduledMessage(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid scheduled message ID" });
    }

    const scheduledMessage = await ScheduledMessage.findOne({
      _id: id,
      sender: req.user._id,
    });
    if (!scheduledMessage) {
      return res.status(404).json({ message: "Scheduled message not found" });
    }
    if (scheduledMessage.status !== "pending") {
      return res.status(409).json({ message: "This message has already been sent" });
    }

    scheduledMessage.status = "canceled";
    await scheduledMessage.save();

    return res.status(200).json({ message: "Scheduled message canceled" });
  } catch (error) {
    console.error("Error canceling scheduled message", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
