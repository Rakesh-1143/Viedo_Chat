import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 300,
    },
    ip: {
      type: String,
      default: "",
      maxlength: 64,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
