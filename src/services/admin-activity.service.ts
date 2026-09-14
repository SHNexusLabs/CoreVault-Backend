import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AdminActivityListOptions = {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
};

export async function getAdminActivities(options: AdminActivityListOptions) {
  const {
    page,
    limit,
    search,
    action,
    entityType,
    entityId,
    userId,
    from,
    to,
  } = options;

  const where: Prisma.AdminActivityWhereInput = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(userId ? { userId } : {}),

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
              action: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              entityId: {
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
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.adminActivity.findMany({
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
            role: true,
          },
        },
      },
    }),

    prisma.adminActivity.count({
      where,
    }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
