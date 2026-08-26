import type { Request, Response } from "express";
import { z } from "zod";

import { getAdminActivities } from "../services/admin-activity.service.js";

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  action: z.string().trim().min(1).optional(),

  entityType: z.string().trim().min(1).optional(),

  entityId: z.string().uuid().optional(),

  userId: z.string().uuid().optional(),
});

export async function getAdminActivityList(req: Request, res: Response) {
  const result = activityQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid activity filters",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminActivities(result.data);
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve admin activity",
    });
  }
}
