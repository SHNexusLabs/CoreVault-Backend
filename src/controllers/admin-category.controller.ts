import type { Request, Response } from "express";
import { z } from "zod";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "../services/admin-category.service.js";

const categorySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = categorySchema.partial();

export async function createAdminCategory(req: Request, res: Response) {
  const result = categorySchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid category data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await createCategory(result.data);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CATEGORY_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A category with this slug already exists",
        });
      }

      if (error.message === "INVALID_PARENT_CATEGORY") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
    }

    throw error;
  }
}

export async function updateAdminCategory(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Category ID is required",
    });
  }

  const result = updateCategorySchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid category data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await updateCategory(id, result.data);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CATEGORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (error.message === "CATEGORY_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A category with this slug already exists",
        });
      }

      if (error.message === "INVALID_PARENT_CATEGORY") {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
    }

    throw error;
  }
}

export async function deleteAdminCategory(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Category ID is required",
    });
  }

  try {
    await deleteCategory(id);

    return res.status(200).json({
      success: true,
      message: "Category removed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    throw error;
  }
}
