import { Router } from "express";

import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setCustomerDefaultAddress,
  updateCustomerAddress,
} from "../controllers/address.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * All address operations belong to an authenticated customer.
 */
router.use(authenticate);

router.get("/", getCustomerAddresses);

router.post("/", createCustomerAddress);

router.patch("/:id", updateCustomerAddress);

router.patch("/:id/default", setCustomerDefaultAddress);

router.delete("/:id", deleteCustomerAddress);

export default router;
