import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  signup,
  onboard,
  deleteAccount,
  updatePassword,
  updateProfile,
  getSessions,
  revokeSession,
  revokeOtherSessions,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1_000 : 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Try again in 15 minutes." },
});

const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1_000 : 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many account changes. Try again in 15 minutes." },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.put("/onboarding", protectRoute, onboard);
router.delete(
  "/delete-account",
  sensitiveActionLimiter,
  protectRoute,
  deleteAccount,
);
router.put(
  "/update-password",
  sensitiveActionLimiter,
  protectRoute,
  updatePassword,
);
router.put("/profile", protectRoute, updateProfile);

router.get("/sessions", protectRoute, getSessions);
router.delete("/sessions/others", protectRoute, revokeOtherSessions);
router.delete("/sessions/:id", protectRoute, revokeSession);

router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
