import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
} from "../services/admin-notification.service.js";

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  isRead: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export async function getAdminNotificationList(req: Request, res: Response) {
  const result = notificationQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminNotifications(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications",
    });
  }
}

export async function markAdminNotificationAsReadController(
  req: Request,
  res: Response,
) {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    const notification = await markAdminNotificationAsRead(id);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    console.error("Mark admin notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
}

export async function markAllAdminNotificationsAsReadController(
  _req: Request,
  res: Response,
) {
  try {
    await markAllAdminNotificationsAsRead();

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all admin notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
}

export async function deleteAdminNotificationController(
  req: Request,
  res: Response,
) {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    await deleteAdminNotification(id);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    console.error("Delete admin notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete notification",
    });
  }
}
