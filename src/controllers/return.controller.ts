import type { Request, Response } from "express";
import { z } from "zod";

import {
  createReturnRequest,
  getUserReturns,
} from "../services/return.service.js";

const createReturnSchema = z.object({
  orderId: z.string().uuid(),

  reason: z.string().trim().min(3).max(1000),

  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "At least one item is required"),
});

export async function createCustomerReturn(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = createReturnSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid return data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const returnRequest = await createReturnRequest({
      userId,
      orderId: result.data.orderId,
      reason: result.data.reason,
      items: result.data.items,
    });

    return res.status(201).json({
      success: true,
      message: "Return request submitted successfully",
      returnRequest,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (error.message === "ORDER_NOT_ELIGIBLE_FOR_RETURN") {
        return res.status(409).json({
          success: false,
          message: "This order is not eligible for return",
        });
      }

      if (
        error.message === "RETURN_ITEMS_REQUIRED" ||
        error.message === "RETURN_REASON_REQUIRED" ||
        error.message === "INVALID_RETURN_QUANTITY"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid return request",
        });
      }

      if (error.message === "INVALID_RETURN_ITEM") {
        return res.status(400).json({
          success: false,
          message: "One or more return items are invalid",
        });
      }

      if (error.message === "RETURN_QUANTITY_EXCEEDS_PURCHASE") {
        return res.status(409).json({
          success: false,
          message: "Return quantity exceeds the available purchased quantity",
        });
      }
    }

    console.error("Create customer return error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit return request",
    });
  }
}

export async function getCustomerReturns(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const returns = await getUserReturns(userId);

    return res.status(200).json({
      success: true,
      returns,
    });
  } catch (error) {
    console.error("Get customer returns error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve return requests",
    });
  }
}
