import type { Request, Response } from "express";

import { getCategories } from "../services/category.service.js";

/*
 * GET /api/categories
 *
 * Returns the complete active category list.
 * The frontend can build the hierarchy using parentId.
 */
export async function getCategoryList(_req: Request, res: Response) {
  try {
    const categories = await getCategories();

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve categories",
    });
  }
}
