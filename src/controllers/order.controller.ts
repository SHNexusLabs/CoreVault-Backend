import type { Request, Response } from "express";
import { z } from "zod";

import {
  cancelOrder,
  createOrder,
  getUserOrder,
  getUserOrders,
} from "../services/order.service.js";

import { DeliveryMethod, PaymentMethod } from "../generated/prisma/client.js";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "At least one product is required"),

  paymentMethod: z.enum(PaymentMethod),
  deliveryMethod: z.enum(DeliveryMethod),

  addressId: z.string().uuid(),
});

/*
 * POST /api/orders
 *
 * Creates an order for the currently authenticated user.
 *
 * userId comes from the JWT middleware, never from req.body.
 */
export async function createCustomerOrder(req: Request, res: Response) {
  const result = createOrderSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid order data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  /*
   * auth middleware attaches the authenticated user's ID
   * to the request.
   */
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const order = await createOrder({
      userId,
      items: result.data.items,
      paymentMethod: result.data.paymentMethod,
      deliveryMethod: result.data.deliveryMethod,
      addressId: result.data.addressId,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_ITEMS_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "At least one product is required",
        });
      }

      if (error.message === "INVALID_QUANTITY") {
        return res.status(400).json({
          success: false,
          message: "Product quantity must be greater than zero",
        });
      }

      if (error.message === "ADDRESS_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Shipping address not found",
        });
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "One or more products were not found",
        });
      }

      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        return res.status(409).json({
          success: false,
          message: "Insufficient stock for one or more products",
        });
      }
    }

    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create order",
    });
  }
}

/*
 * GET /api/orders
 *
 * Returns the authenticated customer's order history.
 */
export async function getCustomerOrders(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const orders = await getUserOrders(userId);

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve orders",
    });
  }
}

/*
 * GET /api/orders/:id
 *
 * Returns one order belonging to the authenticated customer.
 */
export async function getCustomerOrder(req: Request, res: Response) {
  const userId = req.user?.id;
  const orderId = req.params.id;

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
    const order = await getUserOrder(userId, orderId);

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

    console.error("Get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order",
    });
  }
}

/*
 * PATCH /api/orders/:id/cancel
 *
 * Cancels an order belonging to the authenticated customer.
 *
 * The service also restores the purchased stock inside the
 * same database transaction.
 */
export async function cancelCustomerOrder(req: Request, res: Response) {
  const userId = req.user?.id;
  const orderId = req.params.id;

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
    const order = await cancelOrder(userId, orderId);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
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

      if (error.message === "ORDER_CANNOT_BE_CANCELLED") {
        return res.status(409).json({
          success: false,
          message: "This order can no longer be cancelled",
        });
      }
    }

    console.error("Cancel order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel order",
    });
  }
}
