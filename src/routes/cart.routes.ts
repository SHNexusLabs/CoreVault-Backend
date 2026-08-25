import { Router } from "express";

import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerCart,
  removeCustomerCartItem,
  updateCustomerCartItem,
} from "../controllers/cart.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCustomerCart);

router.post("/items", addCustomerCartItem);

router.patch("/items/:productId", updateCustomerCartItem);

router.delete("/items/:productId", removeCustomerCartItem);

router.delete("/", clearCustomerCart);

export default router;
