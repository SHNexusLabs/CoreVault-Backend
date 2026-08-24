import { Router } from "express";

import {
  getAdminOrderDetails,
  getAdminOrderList,
  updateAdminOrderStatus,
} from "../controllers/admin-order.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Orders contain customer information, so every endpoint
 * requires authentication and an administrative role.
 */
router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminOrderList);
router.get("/:id", getAdminOrderDetails);
router.patch("/:id/status", updateAdminOrderStatus);

export default router;
