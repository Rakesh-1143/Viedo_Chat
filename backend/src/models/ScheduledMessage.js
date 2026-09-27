import mongoose from "mongoose";

export const SCHEDULED_MESSAGE_STATUSES = ["pending", "sent", "failed", "canceled"];

const scheduledMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelId: {
      type: String,
      required: true,
      maxlength: 200,
    },
    text: {
      type: String,
      required: true,
      maxlength: 5_000,
    },
    sendAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: SCHEDULED_MESSAGE_STATUSES,
      default: "pending",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true },
);

scheduledMessageSchema.index({ status: 1, sendAt: 1 });

const ScheduledMessage = mongoose.model("ScheduledMessage", scheduledMessageSchema);
export default ScheduledMessage;
