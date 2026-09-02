import type { Request, Response } from "express";
import { z } from "zod";
import {
  getAnalyticsOverview,
  type AnalyticsGranularity,
} from "../services/admin-analytics.service.js";

const analyticsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export async function getAnalyticsOverviewController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = analyticsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid analytics query parameters",
        errors: parsed.error.flatten(),
      });
    }

    const { from, to, granularity } = parsed.data;

    if (to < from) {
      return res.status(400).json({
        success: false,
        message: "'to' date must be greater than or equal to 'from' date",
      });
    }

    const data = await getAnalyticsOverview({
      from,
      to,
      granularity: granularity as AnalyticsGranularity,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
}
