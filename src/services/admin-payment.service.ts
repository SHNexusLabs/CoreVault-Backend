import {
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type AdminPaymentListOptions = {
  page: number;
  limit: number;
  search?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
};

export async function getAdminPayments(options: AdminPaymentListOptions) {
  const { page, limit, search, status, method } = options;

  const where = {
    ...(status !== undefined
      ? {
          paymentStatus: status,
        }
      : {}),

    ...(method !== undefined
      ? {
          paymentMethod: method,
        }
      : {}),

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

  const [payments, total, paid, pending, failed, refunded] = await Promise.all([
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
        paymentMethod: true,
        paymentStatus: true,
        total: true,
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

    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.PAID,
      },
    }),

    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.PENDING,
      },
    }),

    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.FAILED,
      },
    }),

    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.REFUNDED,
      },
    }),
  ]);

  return {
    payments,

    stats: {
      transactions: total,
      paid,
      pending,
      failed,
      refunded,
    },

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
