import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addGroupMembers,
  authorizeDirectCall,
  createGroup,
  getDirectConversation,
  getGroupInfo,
  getStreamToken,
  removeGroupMember,
  renameGroup,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.get("/direct/:userId", protectRoute, getDirectConversation);
router.post("/call/:userId", protectRoute, authorizeDirectCall);
router.post("/group", protectRoute, createGroup);
router.get("/group/:channelId", protectRoute, getGroupInfo);
router.patch("/group/:channelId", protectRoute, renameGroup);
router.post("/group/:channelId/members", protectRoute, addGroupMembers);
router.delete("/group/:channelId/members/:userId", protectRoute, removeGroupMember);

export default router;
