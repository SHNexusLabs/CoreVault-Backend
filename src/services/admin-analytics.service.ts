import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AnalyticsGranularity = "day" | "week" | "month";

interface AnalyticsOptions {
  from: Date;
  to: Date;
  granularity: AnalyticsGranularity;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return Number(value);
}

function formatBucket(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getAnalyticsOverview({
  from,
  to,
  granularity,
}: AnalyticsOptions) {
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);

  // `to` is inclusive.
  const toDateExclusive = new Date(to);
  toDateExclusive.setHours(0, 0, 0, 0);
  toDateExclusive.setDate(toDateExclusive.getDate() + 1);

  const truncUnit =
    granularity === "month" ? "month" : granularity === "week" ? "week" : "day";

  const revenueSeriesRaw = await prisma.$queryRaw<
    Array<{
      bucket: Date;
      revenue: unknown;
    }>
  >(
    Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, o.created_at) AS bucket,
        COALESCE(SUM(o.total), 0) AS revenue
      FROM orders o
      WHERE
        o.created_at >= ${fromDate}
        AND o.created_at < ${toDateExclusive}
        AND o.payment_status = 'PAID'
        AND o.status <> 'CANCELLED'
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
  );

  const orderSeriesRaw = await prisma.$queryRaw<
    Array<{
      bucket: Date;
      orders: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, o.created_at) AS bucket,
        COUNT(*) AS orders
      FROM orders o
      WHERE
        o.created_at >= ${fromDate}
        AND o.created_at < ${toDateExclusive}
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
  );

  const statusDistributionRaw = await prisma.$queryRaw<
    Array<{
      status: string;
      count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        o.status,
        COUNT(*) AS count
      FROM orders o
      WHERE
        o.created_at >= ${fromDate}
        AND o.created_at < ${toDateExclusive}
      GROUP BY o.status
      ORDER BY count DESC
    `,
  );

  const topProductsRaw = await prisma.$queryRaw<
    Array<{
      productId: string;
      name: string;
      quantity: bigint;
      revenue: unknown;
    }>
  >(
    Prisma.sql`
      SELECT
        oi.product_id AS "productId",
        p.name,
        SUM(oi.quantity) AS quantity,
        COALESCE(
          SUM(oi.quantity * oi.unit_price),
          0
        ) AS revenue
      FROM order_items oi
      INNER JOIN orders o
        ON o.id = oi.order_id
      INNER JOIN products p
        ON p.id = oi.product_id
      WHERE
        o.created_at >= ${fromDate}
        AND o.created_at < ${toDateExclusive}
        AND o.payment_status = 'PAID'
        AND o.status <> 'CANCELLED'
      GROUP BY
        oi.product_id,
        p.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
  );

  const categoryPerformanceRaw = await prisma.$queryRaw<
    Array<{
      categoryId: string;
      name: string;
      orders: bigint;
      revenue: unknown;
    }>
  >(
    Prisma.sql`
      SELECT
        c.id AS "categoryId",
        c.name,
        COUNT(DISTINCT o.id) AS orders,
        COALESCE(
          SUM(oi.quantity * oi.unit_price),
          0
        ) AS revenue
      FROM order_items oi
      INNER JOIN orders o
        ON o.id = oi.order_id
      INNER JOIN products p
        ON p.id = oi.product_id
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE
        o.created_at >= ${fromDate}
        AND o.created_at < ${toDateExclusive}
        AND o.payment_status = 'PAID'
        AND o.status <> 'CANCELLED'
      GROUP BY
        c.id,
        c.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
  );

  const paidMetrics = await prisma.order.aggregate({
    where: {
      createdAt: {
        gte: fromDate,
        lt: toDateExclusive,
      },
      paymentStatus: "PAID",
      status: {
        not: "CANCELLED",
      },
    },
    _sum: {
      total: true,
    },
    _count: true,
  });

  const totalOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: fromDate,
        lt: toDateExclusive,
      },
    },
  });

  const cancelledOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: fromDate,
        lt: toDateExclusive,
      },
      status: "CANCELLED",
    },
  });

  const paidRevenue = paidMetrics._sum?.total
    ? toNumber(paidMetrics._sum.total)
    : 0;

  const paidOrders =
    typeof paidMetrics._count === "number" ? paidMetrics._count : 0;

  const averageOrderValue = paidOrders > 0 ? paidRevenue / paidOrders : 0;

  return {
    range: {
      from: fromDate.toISOString(),
      to: new Date(toDateExclusive.getTime() - 1).toISOString(),
      granularity,
    },

    revenueSeries: revenueSeriesRaw.map((item) => ({
      date: formatBucket(item.bucket),
      revenue: toNumber(item.revenue),
    })),

    orderSeries: orderSeriesRaw.map((item) => ({
      date: formatBucket(item.bucket),
      orders: Number(item.orders),
    })),

    statusDistribution: statusDistributionRaw.map((item) => ({
      status: item.status,
      count: Number(item.count),
    })),

    topProducts: topProductsRaw.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity),
      revenue: toNumber(item.revenue),
    })),

    categoryPerformance: categoryPerformanceRaw.map((item) => ({
      categoryId: item.categoryId,
      name: item.name,
      orders: Number(item.orders),
      revenue: toNumber(item.revenue),
    })),

    metrics: {
      revenue: paidRevenue,
      orders: totalOrders,
      averageOrderValue,
      cancelledOrders,
    },
  };
}
