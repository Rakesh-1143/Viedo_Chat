const STORAGE_PREFIX = "streamify:wallpaper:";

export const WALLPAPER_OPTIONS = [
  { id: "default", label: "Default", value: null },
  { id: "sand", label: "Sand", value: "#f2e8d5" },
  { id: "sky", label: "Sky", value: "#dbeeff" },
  { id: "mint", label: "Mint", value: "#dff5ec" },
  { id: "blush", label: "Blush", value: "#fbe4ec" },
  { id: "slate", label: "Slate", value: "#e4e7ec" },
];

export const getWallpaper = (channelId) => {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${channelId}`);
  } catch {
    return null;
  }
};

export const setWallpaper = (channelId, value) => {
  try {
    if (value) window.localStorage.setItem(`${STORAGE_PREFIX}${channelId}`, value);
    else window.localStorage.removeItem(`${STORAGE_PREFIX}${channelId}`);
  } catch {
    // Browser storage may be unavailable (private mode, blocked cookies); ignore.
  }
};
