import type { Request, Response } from "express";
import { z } from "zod";

import {
  createReview,
  getProductReviews,
  getUserReviews,
} from "../services/review.service.js";

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(200).optional(),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export async function createCustomerReview(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = createReviewSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid review data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const review = await createReview({
      userId,
      productId: result.data.productId,
      rating: result.data.rating,
      title: result.data.title,
      comment: result.data.comment,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (error.message === "PRODUCT_NOT_PURCHASED") {
        return res.status(403).json({
          success: false,
          message: "You can only review products you have purchased",
        });
      }

      if (error.message === "REVIEW_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }
    }

    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit review",
    });
  }
}

/*
 * GET /api/reviews/product/:productId
 *
 * Returns only approved reviews for a product.
 *
 * This endpoint is public because approved reviews are catalog
 * information, not private customer information.
 */
export async function getProductReviewList(req: Request, res: Response) {
  const productId = req.params.productId;

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  try {
    const reviews = await getProductReviews(productId);

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.error("Get product reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reviews",
    });
  }
}

export async function getCustomerReviews(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const reviews = await getUserReviews(userId);

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Get customer reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reviews",
    });
  }
}
