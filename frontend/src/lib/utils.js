export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const BROWSERS = ["Edg", "OPR", "Chrome", "Firefox", "Safari"];
const BROWSER_LABELS = { Edg: "Edge", OPR: "Opera" };
const PLATFORMS = [
  ["Windows", "Windows"],
  ["Mac OS X", "macOS"],
  ["Android", "Android"],
  ["iPhone", "iOS"],
  ["iPad", "iPadOS"],
  ["Linux", "Linux"],
];

export const formatUserAgent = (userAgent) => {
  if (!userAgent) return "Unknown device";
  const browser = BROWSERS.find((name) => userAgent.includes(name));
  const platform = PLATFORMS.find(([needle]) => userAgent.includes(needle));
  const browserLabel = browser ? BROWSER_LABELS[browser] || browser : "Unknown browser";
  return platform ? `${browserLabel} on ${platform[1]}` : browserLabel;
};

export const formatLastSeen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "last seen just now";
  if (diffMinutes < 60) return `last seen ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (sameDay) return `last seen today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `last seen yesterday at ${time}`;
  }

  if (diffHours < 24 * 7) {
    return `last seen ${date.toLocaleDateString([], { weekday: "long" })} at ${time}`;
  }

  return `last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
};
