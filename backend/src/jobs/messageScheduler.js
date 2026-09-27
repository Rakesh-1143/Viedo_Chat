import ScheduledMessage from "../models/ScheduledMessage.js";
import { getStreamClient, isStreamConfigured } from "../lib/stream.js";

const SCHEDULED_MESSAGE_INTERVAL_MS = 30_000;
const DISAPPEARING_SWEEP_INTERVAL_MS = 60_000;
const DISPATCH_BATCH_SIZE = 20;

const dispatchDueScheduledMessages = async () => {
  const due = await ScheduledMessage.find({
    status: "pending",
    sendAt: { $lte: new Date() },
  }).limit(DISPATCH_BATCH_SIZE);

  for (const scheduledMessage of due) {
    try {
      const channel = getStreamClient().channel(
        "messaging",
        scheduledMessage.channelId,
      );
      await channel.sendMessage({
        text: scheduledMessage.text,
        user_id: String(scheduledMessage.sender),
      });
      scheduledMessage.status = "sent";
      scheduledMessage.sentAt = new Date();
      await scheduledMessage.save();
    } catch (error) {
      console.error("Failed to dispatch scheduled message", scheduledMessage.id, error.message);
      scheduledMessage.status = "failed";
      scheduledMessage.error = error.message?.slice(0, 500) || "Unknown error";
      await scheduledMessage.save().catch(() => undefined);
    }
  }
};

const sweepDisappearingMessages = async () => {
  const client = getStreamClient();
  const channels = await client.queryChannels(
    { type: "messaging", disappearing_duration_seconds: { $gt: 0 } },
    {},
    { limit: 30, state: false, watch: false, presence: false },
  );

  for (const channel of channels) {
    const durationSeconds = channel.data?.disappearing_duration_seconds;
    if (!durationSeconds) continue;

    const cutoff = new Date(Date.now() - durationSeconds * 1000);
    try {
      const response = await channel.search(
        { created_at: { $lte: cutoff.toISOString() } },
        { limit: 30 },
      );
      for (const result of response.results || []) {
        await client.deleteMessage(result.message.id).catch((error) => {
          console.error("Failed to delete expired message", result.message.id, error.message);
        });
      }
    } catch (error) {
      console.error("Failed to sweep disappearing messages for", channel.id, error.message);
    }
  }
};

export const startMessageSchedulerJobs = () => {
  if (!isStreamConfigured()) return () => undefined;

  const scheduledInterval = setInterval(() => {
    dispatchDueScheduledMessages().catch((error) => {
      console.error("Scheduled message dispatch failed", error.message);
    });
  }, SCHEDULED_MESSAGE_INTERVAL_MS);

  const disappearingInterval = setInterval(() => {
    sweepDisappearingMessages().catch((error) => {
      console.error("Disappearing message sweep failed", error.message);
    });
  }, DISAPPEARING_SWEEP_INTERVAL_MS);

  scheduledInterval.unref();
  disappearingInterval.unref();

  return () => {
    clearInterval(scheduledInterval);
    clearInterval(disappearingInterval);
  };
};
