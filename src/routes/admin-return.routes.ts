import { Router } from "express";

import {
  approveAdminRefund,
  completeAdminRefund,
  failAdminRefund,
  getAdminReturnDetails,
  getAdminReturnList,
  retryAdminRefund,
  startAdminRefundProcessing,
  updateAdminReturnStatus,
} from "../controllers/admin-return.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminReturnList);

router.get("/:id", getAdminReturnDetails);

router.patch("/:id/status", updateAdminReturnStatus);

router.patch("/:id/refund/approve", approveAdminRefund);

router.patch("/:id/refund/process", startAdminRefundProcessing);

router.patch("/:id/refund/complete", completeAdminRefund);

router.patch("/:id/refund/fail", failAdminRefund);

router.patch("/:id/refund/retry", retryAdminRefund);

export default router;
