import type { Request, Response } from "express";

import {
  addToWishlist,
  clearWishlist,
  getWishlist,
  removeFromWishlist,
} from "../services/wishlist.service.js";

/*
 * GET /api/wishlist
 *
 * Returns the authenticated user's wishlist.
 */
export async function getCustomerWishlist(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const wishlist = await getWishlist(userId);

    return res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wishlist",
    });
  }
}

/*
 * POST /api/wishlist/:productId
 *
 * Adds one product to the authenticated user's wishlist.
 */
export async function addCustomerWishlistItem(req: Request, res: Response) {
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
    const wishlist = await addToWishlist(userId, productId);

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (error.message === "ALREADY_IN_WISHLIST") {
        return res.status(409).json({
          success: false,
          message: "Product is already in your wishlist",
        });
      }
    }

    console.error("Add wishlist item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add product to wishlist",
    });
  }
}

/*
 * DELETE /api/wishlist/:productId
 *
 * Removes one product from the authenticated user's wishlist.
 */
export async function removeCustomerWishlistItem(req: Request, res: Response) {
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
    const wishlist = await removeFromWishlist(userId, productId);

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "WISHLIST_ITEM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    console.error("Remove wishlist item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove product from wishlist",
    });
  }
}

/*
 * DELETE /api/wishlist
 *
 * Clears the authenticated user's entire wishlist.
 */
export async function clearCustomerWishlist(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    await clearWishlist(userId);

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      wishlist: [],
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to clear wishlist",
    });
  }
}
