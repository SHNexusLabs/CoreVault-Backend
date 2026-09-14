import type { Request, Response } from "express";
import {
  getAdminRolePermissions,
  updateAdminRolePermissions,
  type AdminRole,
} from "../services/admin-roles.service.js";

function getUserId(req: Request): string {
  const userId = req.user?.id;

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

function parseRole(value: string | string[]): AdminRole {
  if (Array.isArray(value)) {
    throw new Error("INVALID_ROLE");
  }

  if (value === "ADMIN" || value === "SUPER_ADMIN") {
    return value;
  }

  throw new Error("INVALID_ROLE");
}

export async function getAdminRolePermissionsController(
  req: Request,
  res: Response,
) {
  try {
    const role = parseRole(req.params.role);

    const result = await getAdminRolePermissions(role);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_ROLE":
          return res.status(400).json({
            success: false,
            message: "Invalid role",
          });

        case "UNAUTHORIZED":
          return res.status(401).json({
            success: false,
            message: "Unauthorized",
          });
      }
    }

    console.error("Get admin role permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load role permissions",
    });
  }
}

export async function updateAdminRolePermissionsController(
  req: Request,
  res: Response,
) {
  try {
    const role = parseRole(req.params.role);

    if (role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Only ADMIN permissions can be modified",
      });
    }

    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "permissionIds must be an array",
      });
    }

    if (!permissionIds.every((id) => typeof id === "string")) {
      return res.status(400).json({
        success: false,
        message: "permissionIds must contain only strings",
      });
    }

    const result = await updateAdminRolePermissions(
      permissionIds,
      getUserId(req),
    );

    return res.json({
      success: true,
      message: "ADMIN permissions updated successfully",
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_ROLE":
          return res.status(400).json({
            success: false,
            message: "Invalid role",
          });

        case "UNAUTHORIZED":
          return res.status(401).json({
            success: false,
            message: "Unauthorized",
          });

        case "INVALID_PERMISSION":
          return res.status(400).json({
            success: false,
            message: "One or more permissions are invalid",
          });

        case "SUPER_ADMIN_PERMISSION":
          return res.status(400).json({
            success: false,
            message: "Super Admin-only permissions cannot be assigned to ADMIN",
          });
      }
    }

    console.error("Update admin role permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update role permissions",
    });
  }
}
