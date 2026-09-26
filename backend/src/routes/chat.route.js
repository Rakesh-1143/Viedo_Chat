import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  authorizeDirectCall,
  createGroup,
  getDirectConversation,
  getStreamToken,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.get("/direct/:userId", protectRoute, getDirectConversation);
router.post("/call/:userId", protectRoute, authorizeDirectCall);
router.post("/group", protectRoute, createGroup);

export default router;
