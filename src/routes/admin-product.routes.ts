import { Router } from "express";

import {
  createAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
} from "../controllers/admin-product.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.post("/", createAdminProduct);
router.patch("/:id", updateAdminProduct);
router.delete("/:id", deleteAdminProduct);

export default router;
