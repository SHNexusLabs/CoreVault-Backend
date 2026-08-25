import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import {
  cancelCustomerOrder,
  createCustomerOrder,
  getCustomerOrder,
  getCustomerOrders,
} from "../controllers/order.controller.js";

const router = Router();

/*
 * Every order endpoint requires an authenticated user.
 */
router.use(authenticate);

router.post("/", createCustomerOrder);
router.get("/", getCustomerOrders);
router.get("/:id", getCustomerOrder);
router.patch("/:id/cancel", cancelCustomerOrder);

export default router;
