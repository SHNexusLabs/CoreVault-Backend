import { Router } from "express";
import {
  getAdminAnalyticsOverviewController,
  getAdminAnalyticsOverview,
} from "../controllers/admin-analytics.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get(
  "/overview",
  getAdminAnalyticsOverviewController,
);

router.get(
  "/",
  getAdminAnalyticsOverview,
);

export default router;
