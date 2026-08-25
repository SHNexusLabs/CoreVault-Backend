import type { Request, Response } from "express";

import { getUserPaymentStatus } from "../services/payment.service.js";

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
