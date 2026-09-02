import { Router } from "express";
import { getAnalyticsOverviewController } from "../controllers/admin-analytics.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/overview",
  authenticate,
  requireRoles("ADMIN", "SUPER_ADMIN"),
  getAnalyticsOverviewController,
);

export default router;
