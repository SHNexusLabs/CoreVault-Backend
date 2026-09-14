import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export type AdminRolePermission = {
  id: string;
  name: string;
  description: string | null;
  section: string;
  isSuperAdminOnly: boolean;
  enabled: boolean;
};

export type AdminRolePermissionsResult = {
  role: AdminRole;
  isEditable: boolean;
  permissions: AdminRolePermission[];
};

export async function getAdminRolePermissions(
  role: AdminRole,
): Promise<AdminRolePermissionsResult> {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ section: "asc" }, { id: "asc" }],
  });

  if (role === "SUPER_ADMIN") {
    return {
      role,
      isEditable: false,
      permissions: permissions.map((permission) => ({
        ...permission,
        enabled: true,
      })),
    };
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      permissionId: true,
    },
  });

  const enabledIds = new Set(
    rolePermissions.map((permission) => permission.permissionId),
  );

  return {
    role,
    isEditable: true,
    permissions: permissions.map((permission) => ({
      ...permission,
      enabled: enabledIds.has(permission.id),
    })),
  };
}

export async function updateAdminRolePermissions(
  permissionIds: string[],
  adminUserId: string,
) {
  const uniquePermissionIds = [...new Set(permissionIds)];

  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: uniquePermissionIds,
      },
    },
    select: {
      id: true,
      isSuperAdminOnly: true,
    },
  });

  if (permissions.length !== uniquePermissionIds.length) {
    throw new Error("INVALID_PERMISSION");
  }

  const restrictedPermission = permissions.find(
    (permission) => permission.isSuperAdminOnly,
  );

  if (restrictedPermission) {
    throw new Error("SUPER_ADMIN_PERMISSION");
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: {
        role: "ADMIN",
      },
    });

    if (uniquePermissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: uniquePermissionIds.map((permissionId) => ({
          role: "ADMIN" as const,
          permissionId,
        })),
      });
    }

    await tx.adminActivity.create({
      data: {
        userId: adminUserId,
        action: "ROLE_PERMISSIONS_UPDATED",
        entityType: "ROLE",
        entityId: "ADMIN",
        metadata: {
          role: "ADMIN",
          permissionIds: uniquePermissionIds,
        } satisfies Prisma.InputJsonValue,
      },
    });
  });

  return getAdminRolePermissions("ADMIN");
}
