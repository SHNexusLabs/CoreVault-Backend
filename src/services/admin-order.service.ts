import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type AdminOrderListOptions = {
  page: number;
  limit: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
};

export async function getAdminOrders(options: AdminOrderListOptions) {
  const { page, limit, search, status, paymentStatus, from, to } = options;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              orderNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              items: {
                some: {
                  productName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,

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
    }),

    prisma.order.count({
      where,
    }),
  ]);

  return {
    orders,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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

      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          sku: true,
          unitPrice: true,
          quantity: true,
          subtotal: true,

          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      },

      returnRequests: {
        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productName: true,
                  sku: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
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
 * PENDING
 *   ↓
 * PROCESSING
 *   ↓
 * SHIPPED
 *   ↓
 * DELIVERED
 *
 * PENDING / PROCESSING
 *        ↓
 *    CANCELLED
 */
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],

  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],

  SHIPPED: [OrderStatus.DELIVERED],

  DELIVERED: [],

  CANCELLED: [],
};

/*
 * Updates order status.
 *
 * The admin user ID is required so the change can be
 * recorded in AdminActivity.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  adminUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },

      select: {
        status: true,
        orderNumber: true,

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

    const previousStatus = order.status;

    if (!allowedTransitions[previousStatus].includes(status)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    /*
     * When cancelling an order, restore the purchased
     * quantities to product inventory.
     *
     * This happens inside the same transaction as the
     * status update.
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

    const updatedOrder = await tx.order.update({
      where: {
        id: orderId,
      },

      data: {
        status,
      },

      select: {
        id: true,
        orderNumber: true,
        status: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
          },
        },
      },
    });

    /*
     * Create customer notification.
     */
    const notificationMessages: Record<
      OrderStatus,
      {
        title: string;
        message: string;
      }
    > = {
      PENDING: {
        title: "Order pending",
        message: `Your order ${order.orderNumber} is pending.`,
      },

      PROCESSING: {
        title: "Order processing",
        message: `Your order ${order.orderNumber} is now being processed.`,
      },

      SHIPPED: {
        title: "Order shipped",
        message: `Your order ${order.orderNumber} has been shipped.`,
      },

      DELIVERED: {
        title: "Order delivered",
        message: `Your order ${order.orderNumber} has been delivered.`,
      },

      CANCELLED: {
        title: "Order cancelled",
        message: `Your order ${order.orderNumber} has been cancelled.`,
      },
    };

    const notification = notificationMessages[status];

    await tx.notification.create({
      data: {
        userId: updatedOrder.user.id,

        title: notification.title,
        message: notification.message,

        type: `ORDER_${status}`,

        entityType: "ORDER",
        entityId: updatedOrder.id,
      },
    });

    /*
     * Record the admin action.
     *
     * This becomes the source for the order timeline
     * and the global admin activity log.
     */
    await tx.adminActivity.create({
      data: {
        userId: adminUserId,

        action: "ORDER_STATUS_UPDATED",

        entityType: "ORDER",
        entityId: orderId,

        metadata: {
          from: previousStatus,
          to: status,
        },
      },
    });

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt,
    };
  });
}

export async function getAdminOrderTimeline(orderId: string) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const activities = await prisma.adminActivity.findMany({
    where: {
      entityType: "ORDER",
      entityId: orderId,
    },

    orderBy: {
      createdAt: "asc",
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return activities.map((activity) => {
    const metadata =
      activity.metadata &&
      typeof activity.metadata === "object" &&
      !Array.isArray(activity.metadata)
        ? (activity.metadata as {
            from?: string;
            to?: string;
          })
        : {};

    let action = activity.action;

    if (activity.action === "ORDER_STATUS_UPDATED" && metadata.to) {
      action = `Order status changed to ${metadata.to}`;
    }

    return {
      id: activity.id,
      type: "order",
      action,
      user: activity.user?.name ?? "System",
      timestamp: activity.createdAt,
    };
  });
}
