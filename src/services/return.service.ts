import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type CreateReturnItemInput = {
  orderItemId: string;
  quantity: number;
};

export type CreateReturnRequestInput = {
  userId: string;
  orderId: string;
  reason: string;
  items: CreateReturnItemInput[];
};

/*
 * Creates a return request for an authenticated customer.
 *
 * The customer can only return items from their own order.
 * Requested quantities are also checked against quantities that
 * have already been returned.
 */
export async function createReturnRequest(input: CreateReturnRequestInput) {
  if (input.items.length === 0) {
    throw new Error("RETURN_ITEMS_REQUIRED");
  }

  if (!input.reason.trim()) {
    throw new Error("RETURN_REASON_REQUIRED");
  }

  /*
   * Merge duplicate order-item IDs.
   */
  const mergedItems = new Map<string, number>();

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new Error("INVALID_RETURN_QUANTITY");
    }

    mergedItems.set(
      item.orderItemId,
      (mergedItems.get(item.orderItemId) ?? 0) + item.quantity,
    );
  }

  const normalizedItems = Array.from(mergedItems.entries()).map(
    ([orderItemId, quantity]) => ({
      orderItemId,
      quantity,
    }),
  );

  return prisma.$transaction(async (tx) => {
    /*
     * The order must belong to the authenticated customer.
     */
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        userId: input.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    /*
     * Only fulfilled orders can currently be returned.
     */
    if (order.status !== "DELIVERED") {
      throw new Error("ORDER_NOT_ELIGIBLE_FOR_RETURN");
    }

    /*
     * Get all requested order items.
     */
    const orderItemIds = normalizedItems.map((item) => item.orderItemId);

    const orderItems = await tx.orderItem.findMany({
      where: {
        id: {
          in: orderItemIds,
        },
        orderId: order.id,
      },
      select: {
        id: true,
        productId: true,
        productName: true,
        quantity: true,
        unitPrice: true,
      },
    });

    if (orderItems.length !== orderItemIds.length) {
      throw new Error("INVALID_RETURN_ITEM");
    }

    /*
     * Find quantities already included in existing return requests.
     *
     * We exclude rejected/cancelled requests because those quantities
     * become available for another return request.
     */
    const previousReturnItems = await tx.returnItem.findMany({
      where: {
        orderItemId: {
          in: orderItemIds,
        },
        returnRequest: {
          status: {
            notIn: ["REJECTED", "CANCELLED"],
          },
        },
      },
      select: {
        orderItemId: true,
        quantity: true,
      },
    });

    const alreadyReturned = new Map<string, number>();

    for (const item of previousReturnItems) {
      alreadyReturned.set(
        item.orderItemId,
        (alreadyReturned.get(item.orderItemId) ?? 0) + item.quantity,
      );
    }

    /*
     * Validate each requested quantity.
     */
    for (const requestedItem of normalizedItems) {
      const orderItem = orderItems.find(
        (item) => item.id === requestedItem.orderItemId,
      );

      if (!orderItem) {
        throw new Error("INVALID_RETURN_ITEM");
      }

      const previousQuantity = alreadyReturned.get(orderItem.id) ?? 0;

      const remainingQuantity = orderItem.quantity - previousQuantity;

      if (requestedItem.quantity > remainingQuantity) {
        throw new Error("RETURN_QUANTITY_EXCEEDS_PURCHASE");
      }
    }

    /*
     * Calculate the initial refund amount from the returned
     * item quantities.
     *
     * This is the maximum item-value refund before any future
     * shipping/fee adjustments.
     */
    let refundAmount = new Prisma.Decimal(0);

    for (const requestedItem of normalizedItems) {
      const orderItem = orderItems.find(
        (item) => item.id === requestedItem.orderItemId,
      );

      if (!orderItem) {
        throw new Error("INVALID_RETURN_ITEM");
      }

      refundAmount = refundAmount.add(
        orderItem.unitPrice.mul(requestedItem.quantity),
      );
    }

    const returnRequest = await tx.returnRequest.create({
      data: {
        orderId: order.id,
        userId: input.userId,
        reason: input.reason.trim(),

        status: "REQUESTED",

        refundAmount,
        refundStatus: "PENDING",

        items: {
          create: normalizedItems.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },

      include: {
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productId: true,
                productName: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
    });

    return returnRequest;
  });
}

/*
 * Returns all return requests belonging to the authenticated
 * customer.
 */
export async function getUserReturns(userId: string) {
  return prisma.returnRequest.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: {
        include: {
          orderItem: {
            select: {
              id: true,
              productId: true,
              productName: true,
              sku: true,
              unitPrice: true,
              quantity: true,
              subtotal: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });
}
