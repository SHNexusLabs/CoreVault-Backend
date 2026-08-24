import type { Request, Response } from "express";
import { z } from "zod";

import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "../services/admin-product.service.js";

/*
 * Product images are stored as a JSON array.
 *
 * Example:
 * [
 *   "/images/products/rtx-4060-front.webp",
 *   "/images/products/rtx-4060-back.webp"
 * ]
 */
const imagesSchema = z.array(z.string()).optional();

/*
 * Product specifications are stored as JSON so different
 * product categories can have different specifications.
 *
 * Example:
 * {
 *   "socket": "AM5",
 *   "cores": 8,
 *   "threads": 16,
 *   "tdp": 65
 * }
 *
 * We currently allow simple JSON values here:
 * string, number and boolean.
 */
const specificationsSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

const productSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  sku: z.string().trim().min(1),

  description: z.string().trim().optional(),

  price: z.number().positive(),

  comparePrice: z.number().positive().optional(),

  brandId: z.string().uuid(),

  categoryId: z.string().uuid(),

  stock: z.number().int().min(0).optional(),

  lowStockAt: z.number().int().min(0).optional(),

  images: imagesSchema,

  specifications: specificationsSchema,

  isActive: z.boolean().optional(),

  isOnDeal: z.boolean().optional(),

  dealStart: z.coerce.date().optional(),

  dealEnd: z.coerce.date().optional(),
});

const updateProductSchema = productSchema.partial();

/*
 * POST /api/admin/products
 *
 * Creates a new product.
 *
 * Authentication and ADMIN/SUPER_ADMIN authorization are handled
 * by the route middleware before this controller is reached.
 */
export async function createAdminProduct(req: Request, res: Response) {
  const result = productSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid product data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const product = await createProduct(result.data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error instanceof Error) {
      /*
       * P2002 is converted by the service into this error.
       * Usually means duplicate SKU or slug.
       */
      if (error.message === "PRODUCT_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A product with this slug or SKU already exists",
        });
      }

      /*
       * Invalid brandId or categoryId.
       */
      if (error.message === "INVALID_PRODUCT_REFERENCE") {
        return res.status(400).json({
          success: false,
          message: "Invalid brand or category",
        });
      }
    }

    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create product",
    });
  }
}

/*
 * PATCH /api/admin/products/:id
 *
 * Updates only the fields supplied by the admin.
 */
export async function updateAdminProduct(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  const result = updateProductSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid product data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const product = await updateProduct(id, result.data);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error instanceof Error) {
      /*
       * The requested product doesn't exist.
       */
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      /*
       * Another product already owns the SKU or slug.
       */
      if (error.message === "PRODUCT_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A product with this slug or SKU already exists",
        });
      }

      /*
       * Invalid brandId or categoryId.
       */
      if (error.message === "INVALID_PRODUCT_REFERENCE") {
        return res.status(400).json({
          success: false,
          message: "Invalid brand or category",
        });
      }
    }

    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update product",
    });
  }
}

/*
 * DELETE /api/admin/products/:id
 *
 * This performs a soft delete.
 *
 * The product remains in the database so historical orders can
 * continue referencing it, but isActive becomes false.
 */
export async function deleteAdminProduct(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  try {
    await deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: "Product removed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove product",
    });
  }
}
