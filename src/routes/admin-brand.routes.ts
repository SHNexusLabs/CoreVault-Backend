import { Router } from "express";

import {
  createAdminBrand,
  deleteAdminBrand,
  updateAdminBrand,
} from "../controllers/admin-brand.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Every route in this router requires authentication
 * and an administrative role.
 */
router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.post("/", createAdminBrand);
router.patch("/:id", updateAdminBrand);
router.delete("/:id", deleteAdminBrand);

export default router;
