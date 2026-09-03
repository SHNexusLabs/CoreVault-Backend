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

export type AdminProductListOptions = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
};

export async function getAdminProducts(options: AdminProductListOptions) {
  const { page, limit, search, categoryId, brandId, isActive, stockStatus } =
    options;

  const where: Prisma.ProductWhereInput = {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),

    ...(categoryId ? { categoryId } : {}),

    ...(brandId ? { brandId } : {}),

    ...(isActive !== undefined ? { isActive } : {}),
  };

  const skip = (page - 1) * limit;

  /*
   * Prisma cannot compare stock against lowStockAt
   * directly in a normal where clause, so the stock
   * filter is handled separately below.
   */
  let stockWhere: Prisma.ProductWhereInput = {};

  if (stockStatus === "out_of_stock") {
    stockWhere = {
      stock: 0,
    };
  }

  if (stockStatus === "in_stock") {
    stockWhere = {
      stock: {
        gt: 0,
      },
    };
  }

  /*
   * Low-stock products are products where:
   *
   * stock > 0
   * AND stock <= lowStockAt
   */
  if (stockStatus === "low_stock") {
    const lowStockProducts = await prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT id
      FROM products
      WHERE stock > 0
        AND stock <= low_stock_at
    `);

    stockWhere = {
      id: {
        in: lowStockProducts.map((product) => product.id),
      },
    };
  }

  const finalWhere: Prisma.ProductWhereInput = {
    ...where,
    ...stockWhere,
  };

  const [products, total, active, lowStock, outOfStock] = await Promise.all([
    prisma.product.findMany({
      where: finalWhere,

      skip,
      take: limit,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),

    prisma.product.count({
      where: finalWhere,
    }),

    prisma.product.count({
      where: {
        isActive: true,
      },
    }),

    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM products
      WHERE stock > 0
        AND stock <= low_stock_at
    `),

    prisma.product.count({
      where: {
        stock: 0,
      },
    }),
  ]);

  return {
    products,

    stats: {
      total: await prisma.product.count(),

      active,

      lowStock: Number(lowStock[0]?.count ?? 0),

      outOfStock,
    },

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* Creates a new product. */
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

/* Updates an existing product. */
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

export async function getAdminProduct(id: string) {
  try {
    return await prisma.product.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
