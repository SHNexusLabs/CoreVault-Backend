import type { Request, Response } from "express";

import {
  getUserPaymentStatus,
  initiatePayment,
} from "../services/payment.service.js";

export async function getCustomerPaymentStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  const orderId = req.params.orderId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof orderId !== "string" || !orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const payment = await getUserPaymentStatus(userId, orderId);

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.error("Get customer payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment status",
    });
  }
}

/*
 * POST /api/payments/orders/:orderId/initiate
 *
 * Starts an online payment attempt for the authenticated customer's
 * order.
 *
 * No payment provider is contacted yet.
 */
export async function initiateCustomerPayment(req: Request, res: Response) {
  const userId = req.user?.id;
  const orderId = req.params.orderId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof orderId !== "string" || !orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const payment = await initiatePayment(userId, orderId);

    return res.status(200).json({
      success: true,
      message: "Payment initiation prepared",
      payment,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (error.message === "ONLINE_PAYMENT_NOT_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "This order does not require online payment",
        });
      }

      if (error.message === "PAYMENT_CANNOT_BE_INITIATED") {
        return res.status(409).json({
          success: false,
          message: "Payment cannot be initiated for this order",
        });
      }

      if (error.message === "ORDER_CANNOT_BE_PAID") {
        return res.status(409).json({
          success: false,
          message: "This order cannot be paid",
        });
      }
    }

    console.error("Initiate customer payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
    });
  }
}
