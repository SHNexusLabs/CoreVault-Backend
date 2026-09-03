import { UserRole } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type AdminCustomerListOptions = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export async function getAdminCustomers(options: AdminCustomerListOptions) {
  const { page, limit, search, isActive } = options;

  const where = {
    role: UserRole.CUSTOMER,

    ...(isActive !== undefined ? { isActive } : {}),

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: search,
              },
            },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [customers, total, activeCustomers, orderStats] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            returnRequests: true,
          },
        },
      },
    }),

    prisma.user.count({
      where,
    }),

    prisma.user.count({
      where: {
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    }),

    prisma.order.aggregate({
      where: {
        user: {
          role: UserRole.CUSTOMER,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
    }),
  ]);

  return {
    customers,

    stats: {
      totalCustomers: total,
      activeCustomers,
      totalOrders: orderStats._count._all,
      totalRevenue: orderStats._sum.total ?? 0,
    },

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAdminCustomer(customerId: string) {
  const customer = await prisma.user.findFirst({
    where: {
      id: customerId,
      role: UserRole.CUSTOMER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,

      addresses: true,

      orders: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
      },

      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          productId: true,
          rating: true,
          title: true,
          comment: true,
          isApproved: true,
          createdAt: true,
        },
      },

      returnRequests: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          orderId: true,
          status: true,
          refundAmount: true,
          refundStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return customer;
}

export async function updateCustomerStatus(
  customerId: string,
  isActive: boolean,
) {
  const customer = await prisma.user.findFirst({
    where: {
      id: customerId,
      role: UserRole.CUSTOMER,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return prisma.user.update({
    where: {
      id: customer.id,
    },
    data: {
      isActive,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
}
