import { OrderStatus, PaymentStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "3m" | "6m" | "1y";

export type AdminAnalyticsOptions = {
  period: AnalyticsPeriod;
};

function getPeriodDates(period: AnalyticsPeriod) {
  const now = new Date();

  const currentStart = new Date(now);

  switch (period) {
    case "today":
      currentStart.setHours(0, 0, 0, 0);
      break;

    case "7d":
      currentStart.setDate(currentStart.getDate() - 7);
      break;

    case "30d":
      currentStart.setDate(currentStart.getDate() - 30);
      break;

    case "3m":
      currentStart.setMonth(currentStart.getMonth() - 3);
      break;

    case "6m":
      currentStart.setMonth(currentStart.getMonth() - 6);
      break;

    case "1y":
      currentStart.setFullYear(currentStart.getFullYear() - 1);
      break;
  }

  const duration = now.getTime() - currentStart.getTime();

  const previousStart = new Date(currentStart.getTime() - duration);

  return {
    now,
    currentStart,
    previousStart,
  };
}

function getBucketKey(date: Date, period: AnalyticsPeriod): string {
  if (period === "today") {
    return date.toISOString().slice(0, 13);
  }

  if (period === "7d" || period === "30d") {
    return date.toISOString().slice(0, 10);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function formatBucketLabel(key: string, period: AnalyticsPeriod): string {
  if (period === "today") {
    const hour = Number(key.slice(11, 13));

    return `${String(hour).padStart(2, "0")}:00`;
  }

  if (period === "7d" || period === "30d") {
    const date = new Date(`${key}T00:00:00`);

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  const date = new Date(`${key}-01T00:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getBucketDates(start: Date, end: Date, period: AnalyticsPeriod) {
  const buckets: string[] = [];

  const cursor = new Date(start);

  if (period === "today") {
    cursor.setMinutes(0, 0, 0);

    while (cursor <= end) {
      buckets.push(getBucketKey(cursor, period));
      cursor.setHours(cursor.getHours() + 1);
    }

    return buckets;
  }

  if (period === "7d" || period === "30d") {
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      buckets.push(getBucketKey(cursor, period));
      cursor.setDate(cursor.getDate() + 1);
    }

    return buckets;
  }

  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    buckets.push(getBucketKey(cursor, period));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

export async function getAdminAnalytics(options: AdminAnalyticsOptions) {
  const { period } = options;

  const { now, currentStart, previousStart } = getPeriodDates(period);

  /*
   * Only paid orders contribute to revenue.
   * Cancelled orders are excluded from sales analytics.
   */
  const revenueOrderWhere = {
    createdAt: {
      gte: currentStart,
      lte: now,
    },
    paymentStatus: PaymentStatus.PAID,
    status: {
      not: OrderStatus.CANCELLED,
    },
  };

  const previousRevenueOrderWhere = {
    createdAt: {
      gte: previousStart,
      lt: currentStart,
    },
    paymentStatus: PaymentStatus.PAID,
    status: {
      not: OrderStatus.CANCELLED,
    },
  };

  const [
    currentRevenue,
    currentOrders,
    previousRevenue,
    previousOrders,
    totalCustomers,
    salesOrders,
    topProductItems,
    categoryItems,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: revenueOrderWhere,
      _sum: {
        total: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.order.count({
      where: {
        createdAt: {
          gte: currentStart,
          lte: now,
        },
        status: {
          not: OrderStatus.CANCELLED,
        },
      },
    }),

    prisma.order.aggregate({
      where: previousRevenueOrderWhere,
      _sum: {
        total: true,
      },
    }),

    prisma.order.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
        status: {
          not: OrderStatus.CANCELLED,
        },
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: {
          gte: currentStart,
          lte: now,
        },
      },
    }),

    prisma.order.findMany({
      where: revenueOrderWhere,
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.orderItem.findMany({
      where: {
        order: revenueOrderWhere,
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
      },
    }),

    prisma.orderItem.findMany({
      where: {
        order: revenueOrderWhere,
      },
      select: {
        subtotal: true,
        quantity: true,
        product: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const revenue = Number(currentRevenue._sum.total ?? 0);
  const previousRevenueValue = Number(previousRevenue._sum.total ?? 0);

  const orderCount = currentOrders;

  const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  const previousAverageOrderValue =
    previousOrders > 0 ? previousRevenueValue / previousOrders : 0;

  const revenueGrowth =
    previousRevenueValue > 0
      ? ((revenue - previousRevenueValue) / previousRevenueValue) * 100
      : 0;

  const orderGrowth =
    previousOrders > 0
      ? ((orderCount - previousOrders) / previousOrders) * 100
      : 0;

  const aovGrowth =
    previousAverageOrderValue > 0
      ? ((averageOrderValue - previousAverageOrderValue) /
          previousAverageOrderValue) *
        100
      : 0;

  /*
   * Revenue / orders chart.
   */
  const buckets = getBucketDates(currentStart, now, period);

  const bucketMap = new Map<
    string,
    {
      date: string;
      revenue: number;
      orders: number;
    }
  >();

  for (const bucket of buckets) {
    bucketMap.set(bucket, {
      date: formatBucketLabel(bucket, period),
      revenue: 0,
      orders: 0,
    });
  }

  for (const order of salesOrders) {
    const bucket = getBucketKey(order.createdAt, period);

    const existing = bucketMap.get(bucket);

    if (!existing) continue;

    existing.revenue += Number(order.total);
    existing.orders += 1;
  }

  const revenueOrders = Array.from(bucketMap.values());

  /*
   * Top products.
   */
  const productMap = new Map<
    string,
    {
      name: string;
      revenue: number;
      orders: number;
      quantity: number;
    }
  >();

  for (const item of topProductItems) {
    const existing = productMap.get(item.productId);

    if (existing) {
      existing.revenue += Number(item.subtotal);
      existing.orders += 1;
      existing.quantity += item.quantity;
    } else {
      productMap.set(item.productId, {
        name: item.productName,
        revenue: Number(item.subtotal),
        orders: 1,
        quantity: item.quantity,
      });
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  /*
   * Category performance.
   */
  const categoryMap = new Map<
    string,
    {
      name: string;
      revenue: number;
      orders: number;
    }
  >();

  for (const item of categoryItems) {
    const category = item.product.category;

    const existing = categoryMap.get(category.id);

    if (existing) {
      existing.revenue += Number(item.subtotal);
      existing.orders += 1;
    } else {
      categoryMap.set(category.id, {
        name: category.name,
        revenue: Number(item.subtotal),
        orders: 1,
      });
    }
  }

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  return {
    period,

    overview: {
      revenue,
      orders: orderCount,
      averageOrderValue,
      customers: totalCustomers,

      growth: {
        revenue: revenueGrowth,
        orders: orderGrowth,
        averageOrderValue: aovGrowth,
      },
    },

    revenueOrders,

    topProducts,

    categories,

    /*
     * These require historical status-transition timestamps.
     * They are intentionally null rather than fake numbers.
     */
    operational: {
      averageProcessingTime: null,
      averagePackingTime: null,
      averageShippingTime: null,
      cancellationRate: null,
      returnRate: null,
      onTimeDelivery: null,
    },
  };
}

export type AnalyticsGranularity = "day" | "week" | "month";

export type AdminAnalyticsOverviewOptions = {
  from: string;
  to: string;
  granularity: AnalyticsGranularity;
};

function parseDateRange(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("INVALID_ANALYTICS_DATE_RANGE");
  }

  if (fromDate > toDate) {
    throw new Error("INVALID_ANALYTICS_DATE_RANGE");
  }

  return {
    fromDate,
    toDate,
  };
}

function getOverviewBucketKey(date: Date, granularity: AnalyticsGranularity) {
  const bucket = new Date(date);

  if (granularity === "day") {
    return bucket.toISOString().slice(0, 10);
  }

  if (granularity === "week") {
    bucket.setUTCHours(0, 0, 0, 0);

    const day = bucket.getUTCDay();

    const daysSinceMonday = day === 0 ? 6 : day - 1;

    bucket.setUTCDate(bucket.getUTCDate() - daysSinceMonday);

    return bucket.toISOString().slice(0, 10);
  }

  bucket.setUTCDate(1);
  bucket.setUTCHours(0, 0, 0, 0);

  return bucket.toISOString().slice(0, 10);
}

function getOverviewBuckets(
  fromDate: Date,
  toDate: Date,
  granularity: AnalyticsGranularity,
) {
  const buckets: string[] = [];
  const cursor = new Date(fromDate);

  if (granularity === "day") {
    cursor.setUTCHours(0, 0, 0, 0);

    while (cursor <= toDate) {
      buckets.push(cursor.toISOString().slice(0, 10));

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return buckets;
  }

  if (granularity === "week") {
    cursor.setUTCHours(0, 0, 0, 0);

    const day = cursor.getUTCDay();

    const daysSinceMonday = day === 0 ? 6 : day - 1;

    cursor.setUTCDate(cursor.getUTCDate() - daysSinceMonday);

    while (cursor <= toDate) {
      buckets.push(cursor.toISOString().slice(0, 10));

      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return buckets;
  }

  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= toDate) {
    buckets.push(cursor.toISOString().slice(0, 10));

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return buckets;
}

export async function getAdminAnalyticsOverview(
  options: AdminAnalyticsOverviewOptions,
) {
  const { fromDate, toDate } = parseDateRange(options.from, options.to);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  /*
   * Revenue is generated from paid,
   * non-cancelled orders.
   */
  const revenueOrders = orders.filter(
    (order) =>
      order.paymentStatus === PaymentStatus.PAID &&
      order.status !== OrderStatus.CANCELLED,
  );

  const revenue = revenueOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  const nonCancelledOrders = orders.filter(
    (order) => order.status !== OrderStatus.CANCELLED,
  );

  const orderCount = nonCancelledOrders.length;

  const averageOrderValue =
    revenueOrders.length > 0 ? revenue / revenueOrders.length : 0;

  const cancelledOrders = orders.filter(
    (order) => order.status === OrderStatus.CANCELLED,
  ).length;

  /*
   * Revenue series.
   */
  const buckets = getOverviewBuckets(fromDate, toDate, options.granularity);

  const revenueMap = new Map<string, number>();

  const orderMap = new Map<string, number>();

  for (const bucket of buckets) {
    revenueMap.set(bucket, 0);
    orderMap.set(bucket, 0);
  }

  for (const order of revenueOrders) {
    const bucket = getOverviewBucketKey(order.createdAt, options.granularity);

    revenueMap.set(bucket, (revenueMap.get(bucket) ?? 0) + Number(order.total));
  }

  for (const order of nonCancelledOrders) {
    const bucket = getOverviewBucketKey(order.createdAt, options.granularity);

    orderMap.set(bucket, (orderMap.get(bucket) ?? 0) + 1);
  }

  const revenueSeries = buckets.map((date) => ({
    date,
    revenue: revenueMap.get(date) ?? 0,
  }));

  const orderSeries = buckets.map((date) => ({
    date,
    orders: orderMap.get(date) ?? 0,
  }));

  /*
   * Order status distribution.
   */
  const statusMap = new Map<string, number>();

  for (const order of orders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
  }

  const statusDistribution = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status,
      count,
    }),
  );

  return {
    range: {
      from: options.from,
      to: options.to,
      granularity: options.granularity,
    },

    revenueSeries,

    orderSeries,

    statusDistribution,

    metrics: {
      revenue,
      orders: orderCount,
      averageOrderValue,
      cancelledOrders,
    },
  };
}
