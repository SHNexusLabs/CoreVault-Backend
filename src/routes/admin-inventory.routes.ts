import { Router } from "express";

import { adjustAdminProductStock, getAdminProductInventoryHistory } from "../controllers/inventory.controller.js";

import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.patch("/:productId", adjustAdminProductStock);
router.get(
  "/:productId/history",
  getAdminProductInventoryHistory,
);

export default router;
