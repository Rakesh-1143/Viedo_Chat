import express from "express";
import { protectAdminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  banReportedUser,
  dismissReport,
  getReports,
  unbanUser,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(protectRoute, protectAdminRoute);

router.get("/reports", getReports);
router.post("/reports/:id/dismiss", dismissReport);
router.post("/reports/:id/ban", banReportedUser);
router.post("/users/:id/unban", unbanUser);

export default router;
