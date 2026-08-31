import { Router } from "express";

import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from "../controllers/admin-coupon.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", listAdminCoupons);
router.get("/:id", getAdminCoupon);
router.post("/", createAdminCoupon);
router.patch("/:id", updateAdminCoupon);
router.delete("/:id", deleteAdminCoupon);

export default router;
