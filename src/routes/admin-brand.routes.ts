import { Router } from "express";

import {
  createAdminBrand,
  deleteAdminBrand,
  updateAdminBrand,
  getAdminBrandList,
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
router.get("/", getAdminBrandList);
router.patch("/:id", updateAdminBrand);
router.delete("/:id", deleteAdminBrand);

export default router;
