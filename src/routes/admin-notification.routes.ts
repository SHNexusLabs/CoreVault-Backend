import { Router } from "express";

import {
  getAdminNotificationList,
  markAdminNotificationAsReadController,
  markAllAdminNotificationsAsReadController,
  deleteAdminNotificationController,
} from "../controllers/admin-notification.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminNotificationList);

router.patch("/read-all", markAllAdminNotificationsAsReadController);

router.patch("/:id/read", markAdminNotificationAsReadController);

router.delete("/:id", deleteAdminNotificationController);

export default router;
