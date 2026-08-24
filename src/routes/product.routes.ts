import { Router } from "express";

import {
  getProductDetails,
  getProductList,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getProductList);
router.get("/:slug", getProductDetails);

export default router;
