import { Router } from "express";

import {
  getCustomerPaymentStatus,
  initiateCustomerPayment,
} from "../controllers/payment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/orders/:orderId", getCustomerPaymentStatus);

router.post("/orders/:orderId/initiate", initiateCustomerPayment);

export default router;
