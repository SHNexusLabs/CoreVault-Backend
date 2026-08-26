import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin-dashboard.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminDashboard);

export default router;
