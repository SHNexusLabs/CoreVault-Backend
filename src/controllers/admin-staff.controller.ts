import { z } from "zod";
import {
  createAdminStaff,
  getAdminStaff,
  updateAdminStaff,
  updateAdminStaffStatus,
} from "../services/admin-staff.service.js";

const staffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});

const updateStaffSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().optional(),
    role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
});

function getUserId(req: any): string | null {
  return req.user?.id ?? null;
}

export async function getAdminStaffList(req: any, res: any) {
  const result = staffQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid staff query parameters",
      errors: result.error.flatten(),
    });
  }

  try {
    const staff = await getAdminStaff(result.data);

    return res.status(200).json({
      success: true,
      ...staff,
    });
  } catch (error) {
    console.error("Failed to fetch admin staff:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff",
    });
  }
}

export async function createAdminStaffController(req: any, res: any) {
  const result = createStaffSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid staff data",
      errors: result.error.flatten(),
    });
  }

  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const staff = await createAdminStaff(result.data, userId);

    return res.status(201).json({
      success: true,
      ...staff,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "STAFF_EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    if (error instanceof Error && error.message === "STAFF_NAME_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Staff name is required",
      });
    }

    if (error instanceof Error && error.message === "STAFF_EMAIL_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Staff email is required",
      });
    }

    console.error("Failed to create admin staff:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create staff account",
    });
  }
}

export async function updateAdminStaffController(req: any, res: any) {
  const result = updateStaffSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid staff data",
      errors: result.error.flatten(),
    });
  }

  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const staffId = req.params.id;

  try {
    const staff = await updateAdminStaff(staffId, result.data, userId);

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Staff account not found",
      });
    }

    if (error instanceof Error && error.message === "NOT_A_STAFF_ACCOUNT") {
      return res.status(400).json({
        success: false,
        message: "The specified user is not a staff account",
      });
    }

    if (
      error instanceof Error &&
      error.message === "STAFF_EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    if (error instanceof Error && error.message === "STAFF_NAME_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Staff name is required",
      });
    }

    if (error instanceof Error && error.message === "STAFF_EMAIL_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Staff email is required",
      });
    }

    if (error instanceof Error && error.message === "NO_STAFF_CHANGES") {
      return res.status(400).json({
        success: false,
        message: "No staff changes were provided",
      });
    }

    console.error("Failed to update admin staff:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update staff",
    });
  }
}

export async function updateAdminStaffStatusController(req: any, res: any) {
  const result = updateStaffStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid staff status",
      errors: result.error.flatten(),
    });
  }

  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const staffId = req.params.id;

  try {
    const staff = await updateAdminStaffStatus(
      staffId,
      result.data.isActive,
      userId,
    );

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Staff account not found",
      });
    }

    if (error instanceof Error && error.message === "NOT_A_STAFF_ACCOUNT") {
      return res.status(400).json({
        success: false,
        message: "The specified user is not a staff account",
      });
    }

    if (error instanceof Error && error.message === "CANNOT_DISABLE_SELF") {
      return res.status(400).json({
        success: false,
        message: "You cannot disable your own account",
      });
    }

    console.error("Failed to update admin staff status:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update staff status",
    });
  }
}
