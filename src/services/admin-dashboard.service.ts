import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

/* Returns aggregated statistics for the admin dashboard. */
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
    activeProductStock,
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

    /*Prisma does not directly compare stock <= lowStockAt*/
    prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        lowStockAt: true,
      },
    }),
  ]);

  /*
   A product is considered low-stock when its current stock
   reaches or falls below its configured threshold.
   */
  const lowStockProducts = activeProductStock.filter(
    (product) => product.stock <= product.lowStockAt,
  ).length;

  /* Prisma Decimal keeps monetary calculations precise. */
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
