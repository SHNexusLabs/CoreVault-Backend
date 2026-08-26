import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type StockAdjustmentInput = {
  productId: string;
  quantity: number;
  reason: string;
  adminUserId: string;
};

/*
 * Adjusts product stock and records the action in AdminActivity
 * inside the same database transaction.
 *
 * Positive quantity = stock added.
 * Negative quantity = stock removed.
 */
export async function adjustProductStock(input: StockAdjustmentInput) {
  if (input.quantity === 0) {
    throw new Error("INVALID_STOCK_ADJUSTMENT");
  }

  if (!input.reason.trim()) {
    throw new Error("STOCK_ADJUSTMENT_REASON_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: input.productId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const newStock = product.stock + input.quantity;

    if (newStock < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    const updatedProduct = await tx.product.update({
      where: {
        id: product.id,
      },
      data: {
        stock: {
          increment: input.quantity,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAt: true,
        isActive: true,
      },
    });

    await tx.adminActivity.create({
      data: {
        userId: input.adminUserId,
        action: input.quantity > 0 ? "STOCK_ADDED" : "STOCK_REMOVED",
        entityType: "PRODUCT",
        entityId: product.id,
        metadata: {
          quantity: input.quantity,
          previousStock: product.stock,
          newStock,
          reason: input.reason.trim(),
        } satisfies Prisma.InputJsonValue,
      },
    });

    return updatedProduct;
  });
}

export async function getProductInventoryHistory(
  productId: string,
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return prisma.adminActivity.findMany({
    where: {
      entityType: "PRODUCT",
      entityId: productId,
      action: {
        in: ["STOCK_ADDED", "STOCK_REMOVED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
