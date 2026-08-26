import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";

import {
  PC_COMPONENT_TYPES,
  checkCompatibility,
  getBuilderComponents,
} from "../services/pc-builder.service.js";

const componentSchema = z.enum(PC_COMPONENT_TYPES);

export async function getPCComponents(req: Request, res: Response) {
  const result = componentSchema.optional().safeParse(req.query.type);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid component type",
    });
  }

  try {
    const products = await getBuilderComponents(result.data);

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("PC builder components error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve PC builder components",
    });
  }
}

const checkSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

export async function checkPCCompatibility(req: Request, res: Response) {
  const result = checkSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid PC build",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: result.data.productIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        specifications: true,
      },
    });

    if (products.length !== result.data.productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products were not found",
      });
    }

    const compatibility = checkCompatibility(products);

    return res.status(200).json({
      success: true,
      ...compatibility,
    });
  } catch (error) {
    console.error("PC compatibility error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check PC compatibility",
    });
  }
}
