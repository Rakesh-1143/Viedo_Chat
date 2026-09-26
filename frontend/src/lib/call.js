export const formatCallDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const twoDigits = (value) => String(value).padStart(2, "0");

  return hours > 0
    ? `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(remainder)}`
    : `${twoDigits(minutes)}:${twoDigits(remainder)}`;
};

export const getCallErrorMessage = (error) => {
  const name = error?.name || "";

  if (name === "NotAllowedError") {
    return "Camera or microphone access was blocked. Allow access in your browser settings, then try again.";
  }
  if (name === "NotFoundError") {
    return "No camera or microphone was found on this device.";
  }
  if (name === "NotReadableError") {
    return "Your camera or microphone is being used by another application.";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You are offline. Reconnect to the internet and try again.";
  }
  return error?.message
    ? `The call could not connect: ${error.message}`
    : "The call could not connect. Check your network and try again.";
};

export const getCallMode = (call) =>
  call?.state?.custom?.mode === "audio" ? "audio" : "video";

