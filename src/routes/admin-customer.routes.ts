import { Router } from "express";

import {
  getAdminCustomerDetails,
  getAdminCustomerList,
  updateAdminCustomerStatus,
} from "../controllers/admin-customer.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminCustomerList);

router.get("/:id", getAdminCustomerDetails);

router.patch("/:id/status", updateAdminCustomerStatus);

export default router;
