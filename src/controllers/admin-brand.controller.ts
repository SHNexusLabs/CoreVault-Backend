import type { Request, Response } from "express";
import { z } from "zod";

import {
  createBrand,
  deleteBrand,
  updateBrand,
} from "../services/admin-brand.service.js";

const brandSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  logo: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

const updateBrandSchema = brandSchema.partial();

export async function createAdminBrand(req: Request, res: Response) {
  const result = brandSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid brand data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const brand = await createBrand(result.data);

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BRAND_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A brand with this slug already exists",
      });
    }

    throw error;
  }
}

export async function updateAdminBrand(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Brand ID is required",
    });
  }

  const result = updateBrandSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid brand data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const brand = await updateBrand(id, result.data);

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BRAND_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      if (error.message === "BRAND_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A brand with this slug already exists",
        });
      }
    }

    throw error;
  }
}

export async function deleteAdminBrand(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Brand ID is required",
    });
  }

  try {
    await deleteBrand(id);

    return res.status(200).json({
      success: true,
      message: "Brand removed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BRAND_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    throw error;
  }
}
