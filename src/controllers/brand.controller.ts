import type { Request, Response } from "express";

import { getBrands } from "../services/brand.service.js";

/*
 * GET /api/brands
 *
 * Public endpoint used by the storefront, mobile app,
 * filters and product forms.
 */
export async function getBrandList(_req: Request, res: Response) {
  try {
    const brands = await getBrands();

    return res.status(200).json({
      success: true,
      brands,
    });
  } catch (error) {
    console.error("Get brands error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve brands",
    });
  }
}
