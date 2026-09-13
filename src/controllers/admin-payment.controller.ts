import type { Request, Response } from "express";
import { z } from "zod";

import { getAdminPayments } from "../services/admin-payment.service.js";

import { updatePaymentStatus } from "../services/payment.service.js";

import { PaymentMethod, PaymentStatus } from "../generated/prisma/client.js";

const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).optional(),

  status: z
    .enum([
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED,
    ])
    .optional(),

  method: z
    .enum([PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.COD])
    .optional(),
});

const updatePaymentStatusSchema = z.object({
  status: z.enum([
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
  ]),
});

export async function getAdminPaymentList(req: Request, res: Response) {
  const result = paymentQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminPayments(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payments",
    });
  }
}

export async function updateAdminPaymentStatus(req: Request, res: Response) {
  const orderId = req.params.orderId;

  if (typeof orderId !== "string" || !orderId) {
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
    const order = await updatePaymentStatus(orderId, result.data.status);

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
          message: "Invalid payment status transition",
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
