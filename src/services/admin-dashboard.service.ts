import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

/* Returns aggregated statistics for the admin dashboard. */
export async function getAdminDashboardStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    activeProducts,
    activeProductStock,
    outOfStockProducts,

    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    paidOrders,

    totalCustomers,

    totalReviews,
    pendingReviews,
    approvedReviews,

    revenueResult,
    todayRevenueResult,

    paymentVerification,
    pendingReturns,
  ] = await Promise.all([
    /* Products */
    prisma.product.count(),

    prisma.product.count({
      where: {
        isActive: true,
      },
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        lowStockAt: true,
      },
    }),

    prisma.product.count({
      where: {
        isActive: true,
        stock: 0,
      },
    }),

    /* Orders */
    prisma.order.count(),

    prisma.order.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.order.count({
      where: {
        status: "PROCESSING",
      },
    }),

    prisma.order.count({
      where: {
        status: "SHIPPED",
      },
    }),

    prisma.order.count({
      where: {
        status: "DELIVERED",
      },
    }),

    prisma.order.count({
      where: {
        status: "CANCELLED",
      },
    }),

    prisma.order.count({
      where: {
        status: {
          not: "CANCELLED",
        },
        paymentStatus: "PAID",
      },
    }),

    /* Customers */
    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    /* Reviews */
    prisma.review.count(),

    prisma.review.count({
      where: {
        isApproved: false,
      },
    }),

    prisma.review.count({
      where: {
        isApproved: true,
      },
    }),

    /* Lifetime revenue */
    prisma.order.aggregate({
      where: {
        status: {
          not: "CANCELLED",
        },
        paymentStatus: "PAID",
      },
      _sum: {
        total: true,
      },
    }),

    /* Today's revenue */
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
        },
        status: {
          not: "CANCELLED",
        },
        paymentStatus: "PAID",
      },
      _sum: {
        total: true,
      },
    }),

    /*
     * Orders requiring payment verification.
     *
     * COD orders are excluded because their payment is expected
     * at delivery rather than online verification.
     */
    prisma.order.count({
      where: {
        status: {
          not: "CANCELLED",
        },
        paymentStatus: "PENDING",
        paymentMethod: {
          not: "COD",
        },
      },
    }),

    /* Customer return requests waiting for admin action */
    prisma.returnRequest.count({
      where: {
        status: "REQUESTED",
      },
    }),
  ]);

  /*
   * Product is low-stock when stock reaches its configured threshold.
   */
  const lowStockProducts = activeProductStock.filter(
    (product) => product.stock <= product.lowStockAt,
  ).length;

  const revenue = revenueResult._sum.total ?? new Prisma.Decimal(0);

  const todayRevenue = todayRevenueResult._sum.total ?? new Prisma.Decimal(0);

  return {
    products: {
      total: totalProducts,
      active: activeProducts,
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
    },

    orders: {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      paid: paidOrders,
    },

    customers: {
      total: totalCustomers,
    },

    reviews: {
      total: totalReviews,
      pending: pendingReviews,
      approved: approvedReviews,
    },

    revenue: {
      total: revenue,
      today: todayRevenue,
    },

    alerts: {
      processingOrders,
      paymentVerification,
      lowStockProducts,
      pendingReturns,
      outOfStockProducts,
    },
  };
}
