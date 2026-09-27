import { axiosInstance } from "./axios";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const isPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

export const getPushSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const enablePushNotifications = async () => {
  if (!isPushSupported()) throw new Error("Push notifications aren't supported here");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { data } = await axiosInstance.get("/push/vapid-public-key");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  await axiosInstance.post("/push/subscribe", subscription.toJSON());
  return subscription;
};

export const disablePushNotifications = async () => {
  const subscription = await getPushSubscription();
  if (!subscription) return;

  await axiosInstance
    .post("/push/unsubscribe", { endpoint: subscription.endpoint })
    .catch(() => undefined);
  await subscription.unsubscribe();
};
