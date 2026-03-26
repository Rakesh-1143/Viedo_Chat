import express from "express";
import {
  login,
  logout,
  signup,
  onboard,
  deleteAccount,
  updatePassword,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/onboarding", protectRoute, onboard);
router.delete("/delete-account", protectRoute, deleteAccount);
router.put("/update-password", protectRoute, updatePassword);

router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
