import PushSubscription from "../models/PushSubscription.js";
import { getVapidPublicKey, isPushConfigured } from "../lib/push.js";

export function getPublicKey(req, res) {
  if (!isPushConfigured()) {
    return res.status(503).json({ message: "Push notifications are not configured" });
  }
  return res.status(200).json({ publicKey: getVapidPublicKey() });
}

export async function subscribe(req, res) {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ message: "Push notifications are not configured" });
    }

    const { endpoint, keys } = req.body || {};
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return res.status(400).json({ message: "A valid subscription endpoint is required" });
    }
    if (typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
      return res.status(400).json({ message: "Invalid subscription keys" });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({ message: "Subscribed to push notifications" });
  } catch (error) {
    console.error("Error in subscribe controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body || {};
    if (typeof endpoint !== "string") {
      return res.status(400).json({ message: "An endpoint is required" });
    }

    await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    return res.status(200).json({ message: "Unsubscribed from push notifications" });
  } catch (error) {
    console.error("Error in unsubscribe controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
