import { PaymentStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AdminInvoiceListOptions = {
  page: number;
  limit: number;
  search?: string;
};

export async function getAdminInvoices(options: AdminInvoiceListOptions) {
  const { page, limit, search } = options;

  const where = {
    paymentStatus: PaymentStatus.PAID,
    ...(search
      ? {
          OR: [
            {
              orderNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
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
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    prisma.order.count({
      where,
    }),
  ]);

  const invoices = orders.map((order) => ({
    id: order.id,

    // Derived for now because Invoice is not a database model yet.
    invoiceNumber: `INV-${order.orderNumber}`,

    orderNumber: order.orderNumber,
    customer: order.user,
    amount: order.total,
    status: order.paymentStatus,
    createdAt: order.createdAt,
  }));

  return {
    invoices,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
