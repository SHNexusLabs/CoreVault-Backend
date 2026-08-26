import type { Request, Response } from "express";
import { z } from "zod";

import {
  adjustProductStock,
  getProductInventoryHistory,
} from "../services/inventory.service.js";

const stockAdjustmentSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((value) => value !== 0, "Quantity cannot be zero"),

  reason: z.string().trim().min(3).max(500),
});

export async function adjustAdminProductStock(req: Request, res: Response) {
  const productId = req.params.productId;
  const adminUserId = req.user?.id;

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  if (!adminUserId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = stockAdjustmentSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid stock adjustment data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const product = await adjustProductStock({
      productId,
      quantity: result.data.quantity,
      reason: result.data.reason,
      adminUserId,
    });

    return res.status(200).json({
      success: true,
      message: "Product stock adjusted successfully",
      product,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (error.message === "INVALID_STOCK_ADJUSTMENT") {
        return res.status(400).json({
          success: false,
          message: "Stock adjustment cannot be zero",
        });
      }

      if (error.message === "STOCK_ADJUSTMENT_REASON_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "A reason is required for stock adjustment",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          success: false,
          message: "Stock cannot be reduced below zero",
        });
      }
    }

    console.error("Adjust product stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to adjust product stock",
    });
  }
}

export async function getAdminProductInventoryHistory(
  req: Request,
  res: Response,
) {
  const productId = req.params.productId;

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  try {
    const history =
      await getProductInventoryHistory(productId);

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.error(
      "Get inventory history error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve inventory history",
    });
  }
}
