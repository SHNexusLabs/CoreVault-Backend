import { OrderStatus, Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export async function getAdminOrders() {
  return prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
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
  });
}

export async function getAdminOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return order;
}

/*
 * Defines the allowed order status transitions.
 *
 * We intentionally keep this state machine in the service layer
 * so the same business rules apply regardless of which admin UI
 * calls the API.
 */
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],

  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],

  SHIPPED: [OrderStatus.DELIVERED],

  DELIVERED: [],

  CANCELLED: [],
};

/*
 * Only the order status is changed here.
 *
 * Payment status and payment processing will be handled
 * separately once we integrate the payment flow.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        status: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (!allowedTransitions[order.status].includes(status)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    /*
     * When an order is cancelled, return all purchased
     * quantities to product inventory.
     *
     * This happens inside the same transaction as the status
     * change, so stock and order status cannot get out of sync.
     */
    if (status === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    return tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });
  });
}
