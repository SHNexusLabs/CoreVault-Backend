import { Router } from "express";
import { getAdminInvoiceList } from "../controllers/admin-invoice.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles("ADMIN", "SUPER_ADMIN"));

router.get("/", getAdminInvoiceList);

export default router;
