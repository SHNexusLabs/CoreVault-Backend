import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import {
  getAdminStaffList,
  createAdminStaffController,
  updateAdminStaffController,
  updateAdminStaffStatusController,
} from "../controllers/admin-staff.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminStaffList);
router.post("/", createAdminStaffController);
router.patch("/:id", updateAdminStaffController);
router.patch("/:id/status", updateAdminStaffStatusController);

export default router;
