import { prisma } from "../lib/prisma.js";

export type AdminActivityFilters = {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
};

export async function getAdminActivities(filters: AdminActivityFilters = {}) {
  return prisma.adminActivity.findMany({
    where: {
      ...(filters.action ? { action: filters.action } : {}),

      ...(filters.entityType ? { entityType: filters.entityType } : {}),

      ...(filters.entityId ? { entityId: filters.entityId } : {}),

      ...(filters.userId ? { userId: filters.userId } : {}),
    },

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
  });
}
