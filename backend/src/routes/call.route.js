import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getCallHistory,
  logCallStart,
  updateCallStatus,
} from "../controllers/call.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getCallHistory);
router.post("/", logCallStart);
router.patch("/:callId", updateCallStatus);

export default router;
