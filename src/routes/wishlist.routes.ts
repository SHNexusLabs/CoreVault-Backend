import { Router } from "express";

import {
  addCustomerWishlistItem,
  clearCustomerWishlist,
  getCustomerWishlist,
  removeCustomerWishlistItem,
} from "../controllers/wishlist.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Every wishlist operation belongs to an authenticated user.
 */
router.use(authenticate);

router.get("/", getCustomerWishlist);

router.post("/:productId", addCustomerWishlistItem);

router.delete("/:productId", removeCustomerWishlistItem);

router.delete("/", clearCustomerWishlist);

export default router;
