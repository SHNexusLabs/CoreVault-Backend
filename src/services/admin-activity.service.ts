import { prisma } from "../lib/prisma.js";

export type AdminActivityListOptions = {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
};

export async function getAdminActivities(options: AdminActivityListOptions) {
  const { page, limit, action, entityType, entityId, userId } = options;

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(userId ? { userId } : {}),
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
