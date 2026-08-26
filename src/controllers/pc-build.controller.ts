import type { Request, Response } from "express";
import { z } from "zod";

import {
  createPCBuild,
  deletePCBuild,
  getPCBuild,
  getUserPCBuilds,
  updatePCBuild,
} from "../services/pc-build.service.js";

/*
 * PC components are stored as product IDs.
 *
 * Every field is optional because users can save an incomplete
 * build and continue working on it later.
 */
const componentsSchema = z.object({
  cpuId: z.string().uuid().optional(),
  motherboardId: z.string().uuid().optional(),
  ramId: z.string().uuid().optional(),
  gpuId: z.string().uuid().optional(),
  storageId: z.string().uuid().optional(),
  psuId: z.string().uuid().optional(),
  coolerId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
});

const createBuildSchema = z.object({
  name: z.string().trim().min(1).max(100),
  components: componentsSchema,
});

const updateBuildSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  components: componentsSchema.optional(),
});

/*
 * Authentication middleware normally guarantees req.user.
 *
 * We still check it here because Express's Request type allows
 * req.user to be undefined. This gives us both runtime safety
 * and clean TypeScript types.
 */
function getAuthenticatedUserId(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });

    return null;
  }

  return req.user.id;
}

/*
 * POST /api/pc-builder/builds
 *
 * Saves a new PC build for the authenticated user.
 */
export async function createSavedPCBuild(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  const result = createBuildSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid PC build data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const build = await createPCBuild(
      userId,
      result.data.name,
      result.data.components,
    );

    return res.status(201).json({
      success: true,
      message: "PC build saved successfully",
      build,
    });
  } catch (error) {
    console.error("Create PC build error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save PC build",
    });
  }
}

/*
 * GET /api/pc-builder/builds
 *
 * Returns only the builds belonging to the authenticated user.
 */
export async function getSavedPCBuilds(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const builds = await getUserPCBuilds(userId);

    return res.status(200).json({
      success: true,
      builds,
    });
  } catch (error) {
    console.error("Get PC builds error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve PC builds",
    });
  }
}

/*
 * GET /api/pc-builder/builds/:id
 *
 * The service checks both the build ID and user ID.
 * This prevents users from accessing another user's build.
 */
export async function getSavedPCBuild(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Build ID is required",
    });
  }

  try {
    const build = await getPCBuild(userId, id);

    if (!build) {
      return res.status(404).json({
        success: false,
        message: "PC build not found",
      });
    }

    return res.status(200).json({
      success: true,
      build,
    });
  } catch (error) {
    console.error("Get PC build error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve PC build",
    });
  }
}

/*
 * PATCH /api/pc-builder/builds/:id
 *
 * Only the fields supplied by the user are updated.
 */
export async function updateSavedPCBuild(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Build ID is required",
    });
  }

  const result = updateBuildSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid PC build data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const build = await updatePCBuild(userId, id, result.data);

    return res.status(200).json({
      success: true,
      message: "PC build updated successfully",
      build,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PC_BUILD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "PC build not found",
      });
    }

    console.error("Update PC build error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update PC build",
    });
  }
}

/*
 * DELETE /api/pc-builder/builds/:id
 *
 * Only the owner of the build can delete it.
 */
export async function deleteSavedPCBuild(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Build ID is required",
    });
  }

  try {
    await deletePCBuild(userId, id);

    return res.status(200).json({
      success: true,
      message: "PC build deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PC_BUILD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "PC build not found",
      });
    }

    console.error("Delete PC build error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete PC build",
    });
  }
}
