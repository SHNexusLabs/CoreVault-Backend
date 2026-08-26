import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

/*
 * Returns aggregated statistics for the admin dashboard.
 *
 * All values are calculated directly from the database so the
 * dashboard cannot become stale because of manually maintained
 * counters.
 */
export async function getAdminDashboardStats() {
  const [
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalCustomers,
    totalReviews,
    pendingReviews,
    approvedReviews,
    revenueResult,
    lowStockProducts,
  ] = await Promise.all([
    prisma.product.count(),

    prisma.product.count({
      where: {
        isActive: true,
      },
    }),

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

    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

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

    /*
     * Cancelled orders should not count as revenue.
     *
     * We use Prisma aggregate so Decimal values remain precise.
     */
    prisma.order.aggregate({
      where: {
        status: {
          not: "CANCELLED",
        },
        paymentStatus: {
          in: ["PAID", "PENDING"],
        },
      },
      _sum: {
        total: true,
      },
    }),

    prisma.product.count({
      where: {
        isActive: true,
        stock: {
          lte: 5,
        },
      },
    }),
  ]);

  const revenue = revenueResult._sum.total ?? new Prisma.Decimal(0);

  return {
    products: {
      total: totalProducts,
      active: activeProducts,
      lowStock: lowStockProducts,
    },

    orders: {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },

    customers: {
      total: totalCustomers,
    },

    reviews: {
      total: totalReviews,
      pending: pendingReviews,
      approved: approvedReviews,
    },

    revenue,
  };
}
