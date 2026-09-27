import mongoose from "mongoose";

export const CALL_STATUSES = [
  "ringing",
  "accepted",
  "completed",
  "rejected",
  "canceled",
  "missed",
];

export const TERMINAL_CALL_STATUSES = [
  "completed",
  "rejected",
  "canceled",
  "missed",
];

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 128,
    },
    channelId: {
      type: String,
      default: "",
      maxlength: 200,
    },
    mode: {
      type: String,
      enum: ["audio", "video"],
      default: "video",
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isGroupCall: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: "",
      maxlength: 80,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: CALL_STATUSES,
      default: "ringing",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const Call = mongoose.model("Call", callSchema);
export default Call;
