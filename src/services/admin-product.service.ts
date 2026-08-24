import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type CreateProductInput = {
  name: string;
  slug: string;
  sku: string;
  description?: string;
  price: number;
  comparePrice?: number;
  brandId: string;
  categoryId: string;
  stock?: number;
  lowStockAt?: number;
  images?: Prisma.InputJsonValue;
  specifications?: Prisma.InputJsonValue;
  isActive?: boolean;
  isOnDeal?: boolean;
  dealStart?: Date;
  dealEnd?: Date;
};

/*
 * Creates a new product.
 *
 * The controller handles HTTP + Zod validation.
 * This service handles the actual database operation.
 */
export async function createProduct(input: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        brandId: input.brandId,
        categoryId: input.categoryId,
        stock: input.stock ?? 0,
        lowStockAt: input.lowStockAt ?? 5,
        images: input.images,
        specifications: input.specifications,
        isActive: input.isActive ?? true,
        isOnDeal: input.isOnDeal ?? false,
        dealStart: input.dealStart,
        dealEnd: input.dealEnd,
      },
      include: {
        brand: true,
        category: true,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Duplicate slug or SKU.
      if (error.code === "P2002") {
        throw new Error("PRODUCT_ALREADY_EXISTS");
      }

      // Invalid brand/category reference.
      if (error.code === "P2003") {
        throw new Error("INVALID_PRODUCT_REFERENCE");
      }
    }

    throw error;
  }
}

/*
 * Updates an existing product.
 *
 * PATCH only changes the fields supplied by the admin.
 * Foreign-key fields are converted into Prisma relations here
 * instead of exposing Prisma-specific types to the controller.
 */
export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>,
) {
  try {
    const { brandId, categoryId, ...productData } = input;

    return await prisma.product.update({
      where: {
        id,
      },
      data: {
        ...productData,

        ...(brandId
          ? {
              brand: {
                connect: {
                  id: brandId,
                },
              },
            }
          : {}),

        ...(categoryId
          ? {
              category: {
                connect: {
                  id: categoryId,
                },
              },
            }
          : {}),
      },
      include: {
        brand: true,
        category: true,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Product doesn't exist.
      if (error.code === "P2025") {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      // Duplicate slug or SKU.
      if (error.code === "P2002") {
        throw new Error("PRODUCT_ALREADY_EXISTS");
      }

      // Invalid brand/category reference.
      if (error.code === "P2003") {
        throw new Error("INVALID_PRODUCT_REFERENCE");
      }
    }

    throw error;
  }
}

/*
 * Products are soft-deleted instead of physically removed.
 *
 * This preserves historical order references and allows us
 * to keep old product information associated with past orders.
 */
export async function deleteProduct(id: string) {
  try {
    return await prisma.product.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    throw error;
  }
}
