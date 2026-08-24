import { Router } from "express";

import {
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
} from "../controllers/admin-category.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * All category management operations require
 * an authenticated administrator.
 */
router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.post("/", createAdminCategory);
router.patch("/:id", updateAdminCategory);
router.delete("/:id", deleteAdminCategory);

export default router;
