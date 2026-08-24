import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminOrder,
  getAdminOrders,
  updateOrderStatus,
} from "../services/admin-order.service.js";

import { OrderStatus } from "../generated/prisma/client.js";

const updateStatusSchema = z.object({
  status: z.enum(OrderStatus),
});

export async function getAdminOrderList(_req: Request, res: Response) {
  try {
    const orders = await getAdminOrders();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get admin orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve orders",
    });
  }
}

export async function getAdminOrderDetails(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const order = await getAdminOrder(id);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.error("Get admin order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order",
    });
  }
}

export async function updateAdminOrderStatus(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  const result = updateStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const order = await updateOrderStatus(id, result.data.status);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_STATUS_TRANSITION"
    ) {
      return res.status(409).json({
        success: false,
        message: "This order status transition is not allowed",
      });
    }
  }
}
