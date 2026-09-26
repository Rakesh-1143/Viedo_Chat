const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,24}$/;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp);base64,/i;
const MAX_PROFILE_PICTURE_LENGTH = 3_000_000;

export const SUPPORTED_LANGUAGES = new Set([
  "english",
  "spanish",
  "french",
  "german",
  "mandarin",
  "odia",
  "japanese",
  "korean",
  "hindi",
  "russian",
  "portuguese",
  "arabic",
  "italian",
  "turkish",
  "telugu",
  "dutch",
]);

export const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export const normalizeEmail = (value) => cleanText(value, 254).toLowerCase();

export const validateEmail = (email) => EMAIL_PATTERN.test(email);

export const validatePassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password);

export const validatePhoneNumber = (phoneNumber) =>
  !phoneNumber || PHONE_PATTERN.test(phoneNumber);

export const normalizeLanguage = (value) => cleanText(value, 40).toLowerCase();

export const validateLanguage = (language) =>
  SUPPORTED_LANGUAGES.has(language);

export const validateProfilePicture = (value) => {
  if (!value) return true;
  if (value.length > MAX_PROFILE_PICTURE_LENGTH) return false;
  if (DATA_IMAGE_PATTERN.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parsePositiveInteger = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};
