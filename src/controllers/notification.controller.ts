import type { Request, Response } from "express";
import { z } from "zod";

import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
} from "../services/notification.service.js";

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function getCustomerNotifications(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = notificationQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getUserNotifications(
      userId,
      result.data.page,
      result.data.limit,
    );

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get customer notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications",
    });
  }
}

export async function markCustomerNotificationAsRead(
  req: Request,
  res: Response,
) {
  const userId = req.user?.id;
  const id = req.params.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    const notification = await markNotificationAsRead(userId, id);

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

    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
}

export async function markAllCustomerNotificationsAsRead(
  req: Request,
  res: Response,
) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    await markAllNotificationsAsRead(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
}

export async function deleteCustomerNotification(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = req.params.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    await deleteNotification(userId, id);

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

    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete notification",
    });
  }
}
