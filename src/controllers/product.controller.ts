import type { Request, Response } from "express";
import { z } from "zod";

import { getProductBySlug, getProducts } from "../services/product.service.js";

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),

  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),

  deal: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  sort: z
    .enum(["newest", "price_asc", "price_desc", "rating"])
    .default("newest"),
});

export async function getProductList(req: Request, res: Response) {
  const result = productQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid product query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  if (
    result.data.minPrice !== undefined &&
    result.data.maxPrice !== undefined &&
    result.data.minPrice > result.data.maxPrice
  ) {
    return res.status(400).json({
      success: false,
      message: "Minimum price cannot be greater than maximum price",
    });
  }

  try {
    const data = await getProducts(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve products",
    });
  }
}

export async function getProductDetails(req: Request, res: Response) {
  const slug = req.params.slug;

  if (typeof slug !== "string" || !slug) {
    return res.status(400).json({
      success: false,
      message: "Product slug is required",
    });
  }

  try {
    const product = await getProductBySlug(slug);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve product",
    });
  }
}
