import { Router } from "express";

import { getCustomerPaymentStatus } from "../controllers/payment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/orders/:orderId", getCustomerPaymentStatus);

export default router;
