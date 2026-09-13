import { Router } from "express";

import {
  getAdminPaymentList,
  updateAdminPaymentStatus,
} from "../controllers/admin-payment.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminPaymentList);

router.patch("/:orderId/status", updateAdminPaymentStatus);

export default router;
