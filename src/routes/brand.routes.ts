import { Router } from "express";

import { getBrandList } from "../controllers/brand.controller.js";

const router = Router();

router.get("/", getBrandList);

export default router;
