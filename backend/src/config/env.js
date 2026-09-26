const DEFAULT_DEVELOPMENT_ORIGINS =
  "http://localhost:5173,http://127.0.0.1:5173";

const splitOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

export const getAllowedOrigins = () => {
  const configured =
    process.env.CLIENT_ORIGINS ||
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_DEVELOPMENT_ORIGINS);

  return splitOrigins(configured);
};

export const assertRequiredEnvironment = () => {
  const required = [
    "MONGO_URL",
    "JWT_SECRET_KEY",
    "STREAM_API_KEY",
    "STREAM_API_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (process.env.JWT_SECRET_KEY.length < 32) {
    throw new Error("JWT_SECRET_KEY must contain at least 32 characters");
  }

  if (process.env.NODE_ENV === "production" && getAllowedOrigins().length === 0) {
    throw new Error(
      "CLIENT_ORIGINS or FRONTEND_URL is required in production",
    );
  }

  for (const origin of getAllowedOrigins()) {
    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid client origin: ${origin}`);
    }
    if (
      process.env.NODE_ENV === "production" &&
      parsedOrigin.protocol !== "https:" &&
      parsedOrigin.protocol !== "capacitor:" &&
      parsedOrigin.protocol !== "ionic:" &&
      parsedOrigin.hostname !== "localhost"
    ) {
      throw new Error("Production client origins must use HTTPS");
    }
  }

  if (
    process.env.STREAM_CALL_TYPE &&
    !/^[a-z0-9_-]{1,64}$/i.test(process.env.STREAM_CALL_TYPE)
  ) {
    throw new Error("STREAM_CALL_TYPE contains unsupported characters");
  }

  if (
    process.env.JWT_EXPIRES_IN &&
    !/^\d+[smhd]$/i.test(process.env.JWT_EXPIRES_IN)
  ) {
    throw new Error("JWT_EXPIRES_IN must use s, m, h, or d, for example 7d");
  }
};
