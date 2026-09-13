import type { Request, Response } from "express";
import { z } from "zod";
import {
  getAdminAnalytics,
  getAdminAnalyticsOverview as getAdminAnalyticsOverviewData,
  type AnalyticsPeriod,
} from "../services/admin-analytics.service.js";
const analyticsQuerySchema = z.object({
  period: z.enum(["today", "7d", "30d", "3m", "6m", "1y"]).default("30d"),
});

const analyticsOverviewQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export async function getAdminAnalyticsOverview(req: Request, res: Response) {
  const result = analyticsQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid analytics period",
      errors: result.error.flatten(),
    });
  }

  try {
    const analytics = await getAdminAnalytics({
      period: result.data.period as AnalyticsPeriod,
    });

    return res.status(200).json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    console.error("Failed to fetch admin analytics:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
}

export async function getAdminAnalyticsOverviewController(
  req: Request,
  res: Response,
) {
  const result = analyticsOverviewQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid analytics date range",
      errors: result.error.flatten(),
    });
  }

  try {
    const analytics = await getAdminAnalyticsOverviewData(result.data);

    return res.status(200).json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_ANALYTICS_DATE_RANGE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid analytics date range",
      });
    }

    console.error("Failed to fetch analytics overview:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics overview",
    });
  }
}
