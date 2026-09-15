import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AdminNotificationListOptions = {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  isRead?: boolean;
};

export async function getAdminNotifications(
  options: AdminNotificationListOptions,
) {
  const { page, limit, search, type, isRead } = options;

  const where: Prisma.NotificationWhereInput = {
    user: {
      role: {
        in: ["ADMIN", "SUPER_ADMIN"],
      },
    },

    ...(type ? { type } : {}),
    ...(typeof isRead === "boolean" ? { isRead } : {}),

    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              message: {
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
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
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

    prisma.notification.count({
      where,
    }),

    prisma.notification.count({
      where: {
        user: {
          role: {
            in: ["ADMIN", "SUPER_ADMIN"],
          },
        },
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markAdminNotificationAsRead(notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      user: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
    },
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllAdminNotificationsAsRead() {
  await prisma.notification.updateMany({
    where: {
      user: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

export async function deleteAdminNotification(notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      user: {
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  await prisma.notification.delete({
    where: {
      id: notificationId,
    },
  });
}
