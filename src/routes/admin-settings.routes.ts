import { Router } from "express";

import {
  getAdminSettingController,
  getAdminSettingsController,
  updateAdminSettingsController,
} from "../controllers/admin-settings.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

/*
 Settings contain store, payment,
 security and other sensitive configuration.
 
 Only ADMIN and SUPER_ADMIN can access
 the settings API.
 */
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminSettingsController);

router.get("/:key", getAdminSettingController);

router.patch("/", updateAdminSettingsController);

export default router;
