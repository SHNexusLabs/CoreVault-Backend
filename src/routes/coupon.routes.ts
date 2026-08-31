import { Router } from "express";

import { validateCustomerCoupon } from "../controllers/coupon.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/validate", authenticate, validateCustomerCoupon);

export default router;
