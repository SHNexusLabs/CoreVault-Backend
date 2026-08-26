import { Router } from "express";

import {
  getAdminReviewList,
  updateAdminReviewApproval,
} from "../controllers/admin-review.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminReviewList);

router.patch("/:id/approval", updateAdminReviewApproval);

export default router;
