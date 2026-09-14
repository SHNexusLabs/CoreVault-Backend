import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import {
  getAdminRolePermissionsController,
  updateAdminRolePermissionsController,
} from "../controllers/admin-roles.controller.js";

const router = Router();

router.use(authenticate);

// Only Super Admin can access role/permission administration.
router.use(requireRoles("SUPER_ADMIN"));

router.get("/:role/permissions", getAdminRolePermissionsController);

router.patch("/:role/permissions", updateAdminRolePermissionsController);

export default router;
