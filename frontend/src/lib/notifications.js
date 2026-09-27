const canUseNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

export const isNotificationSupported = canUseNotifications;

export const getNotificationPermission = () =>
  canUseNotifications() ? Notification.permission : "unsupported";

export const requestNotificationPermission = async () => {
  if (!canUseNotifications()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const showNotification = (title, { onClick, ...options } = {}) => {
  if (!canUseNotifications() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    const notification = new Notification(title, {
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      ...options,
    });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  } catch (error) {
    console.error("Failed to show browser notification", error);
  }
};
