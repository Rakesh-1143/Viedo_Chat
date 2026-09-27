import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com";

let isConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  isConfigured = true;
}

export const isPushConfigured = () => isConfigured;

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY || null;

export const sendPushToUser = async (userId, payload) => {
  if (!isConfigured) return;

  const subscriptions = await PushSubscription.find({ user: userId });
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          body,
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id }).catch(() => undefined);
        } else {
          console.error("Failed to send push notification", error.message);
        }
      }
    }),
  );
};
