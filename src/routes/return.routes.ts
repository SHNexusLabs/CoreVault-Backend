import { Router } from "express";

import {
  createCustomerReturn,
  getCustomerReturns,
} from "../controllers/return.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCustomerReturns);

router.post("/", createCustomerReturn);

export default router;
