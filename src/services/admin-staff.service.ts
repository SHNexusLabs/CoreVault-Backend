import type { Prisma } from "../generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

export type AdminStaffListOptions = {
  page: number;
  limit: number;
  search?: string;
};

export type CreateAdminStaffInput = {
  name: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
};

export type UpdateAdminStaffInput = {
  name?: string;
  email?: string;
  role?: "ADMIN" | "SUPER_ADMIN";
};

export async function getAdminStaff(options: AdminStaffListOptions) {
  const { page, limit, search } = options;

  const where: Prisma.UserWhereInput = {
    role: {
      in: ["ADMIN", "SUPER_ADMIN"],
    },

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [staff, total, active, admins, superAdmins] = await Promise.all([
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
        updatedAt: true,
      },
    }),

    prisma.user.count({
      where,
    }),

    prisma.user.count({
      where: {
        ...where,
        isActive: true,
      },
    }),

    prisma.user.count({
      where: {
        role: "ADMIN",
      },
    }),

    prisma.user.count({
      where: {
        role: "SUPER_ADMIN",
      },
    }),
  ]);

  return {
    staff,

    stats: {
      total,
      active,
      admins,
      superAdmins,
    },

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createAdminStaff(
  input: CreateAdminStaffInput,
  createdByUserId: string,
) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!name) {
    throw new Error("STAFF_NAME_REQUIRED");
  }

  if (!email) {
    throw new Error("STAFF_EMAIL_REQUIRED");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new Error("STAFF_EMAIL_ALREADY_EXISTS");
  }

  /*
   * Temporary password.
   *
   * We do not expose this password through
   * the API response. A proper email/password
   * reset flow can replace this later.
   */
  const temporaryPassword = `${randomUUID().slice(0, 8)}A!`;

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const staff = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: input.role,
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await tx.adminActivity.create({
      data: {
        userId: createdByUserId,
        action: "STAFF_CREATED",
        entityType: "USER",
        entityId: created.id,
        metadata: {
          name: created.name,
          email: created.email,
          role: created.role,
        },
      },
    });

    return created;
  });

  return {
    staff,
    temporaryPassword,
  };
}

export async function updateAdminStaff(
  id: string,
  input: UpdateAdminStaffInput,
  updatedByUserId: string,
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  if (!existing) {
    throw new Error("STAFF_NOT_FOUND");
  }

  if (existing.role !== "ADMIN" && existing.role !== "SUPER_ADMIN") {
    throw new Error("NOT_A_STAFF_ACCOUNT");
  }

  const data: {
    name?: string;
    email?: string;
    role?: "ADMIN" | "SUPER_ADMIN";
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("STAFF_NAME_REQUIRED");
    }

    data.name = name;
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();

    if (!email) {
      throw new Error("STAFF_EMAIL_REQUIRED");
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== id) {
      throw new Error("STAFF_EMAIL_ALREADY_EXISTS");
    }

    data.email = email;
  }

  if (input.role !== undefined) {
    data.role = input.role;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("NO_STAFF_CHANGES");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.adminActivity.create({
      data: {
        userId: updatedByUserId,
        action: "STAFF_UPDATED",
        entityType: "USER",
        entityId: id,
        metadata: {
          changes: data,
        },
      },
    });

    return user;
  });

  return updated;
}

export async function updateAdminStaffStatus(
  id: string,
  isActive: boolean,
  updatedByUserId: string,
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!existing) {
    throw new Error("STAFF_NOT_FOUND");
  }

  if (existing.role !== "ADMIN" && existing.role !== "SUPER_ADMIN") {
    throw new Error("NOT_A_STAFF_ACCOUNT");
  }

  if (existing.id === updatedByUserId && !isActive) {
    throw new Error("CANNOT_DISABLE_SELF");
  }

  if (existing.isActive === isActive) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.adminActivity.create({
      data: {
        userId: updatedByUserId,
        action: isActive ? "STAFF_ENABLED" : "STAFF_DISABLED",
        entityType: "USER",
        entityId: id,
        metadata: {
          isActive,
        },
      },
    });

    return user;
  });

  return updated;
}
