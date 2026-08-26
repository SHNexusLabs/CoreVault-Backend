import { Router } from "express";

import {
  getCustomerNotifications,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
  deleteCustomerNotification,
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCustomerNotifications);

router.patch("/:id/read", markCustomerNotificationAsRead);

router.patch("/read-all", markAllCustomerNotificationsAsRead);

router.delete("/:id", deleteCustomerNotification);

export default router;
