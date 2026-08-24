import { Router } from "express";

import { getCategoryList } from "../controllers/category.controller.js";

const router = Router();

router.get("/", getCategoryList);

export default router;
