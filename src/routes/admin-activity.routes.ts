import { Router } from "express";

import { getAdminActivityList } from "../controllers/admin-activity.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.use(requireRoles("SUPER_ADMIN"));

router.get("/", getAdminActivityList);

export default router;
