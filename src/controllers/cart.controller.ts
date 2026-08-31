import type { Request, Response } from "express";
import { z } from "zod";

import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "../services/cart.service.js";

const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

/* GET /api/cart */
export async function getCustomerCart(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const cart = await getCart(userId);

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve cart",
    });
  }
}

/* POST /api/cart/items */
export async function addCustomerCartItem(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = addCartItemSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid cart item data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const cart = await addToCart(
      userId,
      result.data.productId,
      result.data.quantity,
    );

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_QUANTITY") {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          success: false,
          message: "Insufficient stock",
        });
      }
    }

    console.error("Add cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add product to cart",
    });
  }
}

/* PATCH /api/cart/items/:productId */
export async function updateCustomerCartItem(req: Request, res: Response) {
  const userId = req.user?.id;
  const productId = req.params.productId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  const result = updateCartItemSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid quantity",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const cart = await updateCartItem(userId, productId, result.data.quantity);

    return res.status(200).json({
      success: true,
      message: "Cart item updated",
      cart,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CART_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      if (error.message === "CART_ITEM_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
        });
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          success: false,
          message: "Insufficient stock",
        });
      }
    }

    console.error("Update cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update cart item",
    });
  }
}

/* DELETE /api/cart/items/:productId */
export async function removeCustomerCartItem(req: Request, res: Response) {
  const userId = req.user?.id;
  const productId = req.params.productId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  try {
    const cart = await removeFromCart(userId, productId);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CART_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      if (error.message === "CART_ITEM_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
        });
      }
    }

    console.error("Remove cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove cart item",
    });
  }
}

/* DELETE /api/cart */
export async function clearCustomerCart(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const cart = await clearCart(userId);

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to clear cart",
    });
  }
}
