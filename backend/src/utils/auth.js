import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

const AUTH_COOKIE = "jwt";
const DEFAULT_AUTH_LIFETIME = "7d";
const DURATION_UNITS = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

const getLifetimeMs = (value) => {
  const match = /^(\d+)([smhd])$/i.exec(value);
  if (!match) return 7 * DURATION_UNITS.d;
  return Number(match[1]) * DURATION_UNITS[match[2].toLowerCase()];
};

const getSameSite = () => {
  const configured = process.env.COOKIE_SAME_SITE?.toLowerCase();
  return ["lax", "strict", "none"].includes(configured)
    ? configured
    : "lax";
};

export const getCookieOptions = () => {
  const sameSite = getSameSite();
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production" ||
    sameSite === "none";

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
  };
};

export const issueAuthCookie = (res, userId, jti = randomUUID()) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_AUTH_LIFETIME;
  const token = jwt.sign(
    { userId: String(userId), jti },
    process.env.JWT_SECRET_KEY,
    { expiresIn },
  );

  res.cookie(AUTH_COOKIE, token, {
    ...getCookieOptions(),
    maxAge: getLifetimeMs(expiresIn),
  });

  return jti;
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE, getCookieOptions());
};
