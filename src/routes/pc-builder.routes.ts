import { Router } from "express";

import {
  checkPCCompatibility,
  getPCComponents,
} from "../controllers/pc-builder.controller.js";

import {
  createSavedPCBuild,
  deleteSavedPCBuild,
  getSavedPCBuild,
  getSavedPCBuilds,
  updateSavedPCBuild,
} from "../controllers/pc-build.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/components", getPCComponents);
router.post("/check", checkPCCompatibility);

// Saved builds require authentication.
router.post("/builds", authenticate, createSavedPCBuild);
router.get("/builds", authenticate, getSavedPCBuilds);
router.get("/builds/:id", authenticate, getSavedPCBuild);
router.patch("/builds/:id", authenticate, updateSavedPCBuild);
router.delete("/builds/:id", authenticate, deleteSavedPCBuild);

export default router;
