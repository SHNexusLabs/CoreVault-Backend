import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminOrder,
  getAdminOrders,
  updateOrderStatus,
} from "../services/admin-order.service.js";

import { updatePaymentStatus } from "../services/payment.service.js";

import { PaymentStatus } from "../generated/prisma/client.js";
import { OrderStatus } from "../generated/prisma/client.js";

const updateStatusSchema = z.object({
  status: z.enum(OrderStatus),
});

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PaymentStatus),
});

const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  status: z.enum(OrderStatus).optional(),
});

export async function updateAdminPaymentStatus(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  const result = updatePaymentStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const order = await updatePaymentStatus(id, result.data.paymentStatus);

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (error.message === "INVALID_PAYMENT_STATUS_TRANSITION") {
        return res.status(409).json({
          success: false,
          message: "This payment status transition is not allowed",
        });
      }
    }

    console.error("Update admin payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update payment status",
    });
  }
}

export async function getAdminOrderList(req: Request, res: Response) {
  const result = adminOrderQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid order query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminOrders(result.data);

    return res.status(200).json({
      success: true,
      ...data,
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
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (error.message === "INVALID_STATUS_TRANSITION") {
        return res.status(409).json({
          success: false,
          message: "This order status transition is not allowed",
        });
      }
    }

    console.error("Update admin order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update order status",
    });
  }
}
