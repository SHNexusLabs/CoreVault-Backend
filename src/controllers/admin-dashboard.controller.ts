import type { Request, Response } from "express";

import { getAdminDashboardStats } from "../services/admin-dashboard.service.js";

export async function getAdminDashboard(_req: Request, res: Response) {
  try {
    const stats = await getAdminDashboardStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard statistics",
    });
  }
}
