import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminReviews,
  updateReviewApproval,
} from "../services/admin-review.service.js";

const updateApprovalSchema = z.object({
  isApproved: z.boolean(),
});

const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  isApproved: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export async function getAdminReviewList(req: Request, res: Response) {
  const result = adminReviewQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid review query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminReviews(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reviews",
    });
  }
}

export async function updateAdminReviewApproval(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Review ID is required",
    });
  }

  const result = updateApprovalSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid review approval data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const review = await updateReviewApproval(id, result.data.isApproved);

    return res.status(200).json({
      success: true,
      message: result.data.isApproved
        ? "Review approved successfully"
        : "Review rejected successfully",
      review,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    console.error("Update admin review approval error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update review",
    });
  }
}
