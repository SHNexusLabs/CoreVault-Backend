import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminSetting,
  getAdminSettings,
  updateAdminSettings,
  validateSettingsSection,
} from "../services/admin-settings.service.js";

const settingsQuerySchema = z.object({
  section: z.string().trim().min(1).optional(),
});

const settingKeyParamSchema = z.object({
  key: z.string().trim().min(1),
});

const updateSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(100),
});

function getUserId(req: Request): string | null {
  return req.user?.id ?? null;
}

/**
 * GET /api/admin/settings
 */
export async function getAdminSettingsController(req: Request, res: Response) {
  const result = settingsQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { section } = result.data;

  if (section && !validateSettingsSection(section)) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings section",
    });
  }

  try {
    const settings = await getAdminSettings(section);

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get admin settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve settings",
    });
  }
}

/**
 * GET /api/admin/settings/:key
 */
export async function getAdminSettingController(req: Request, res: Response) {
  const result = settingKeyParamSchema.safeParse(req.params);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid setting key",
    });
  }

  try {
    const setting = await getAdminSetting(result.data.key);

    return res.status(200).json({
      success: true,
      setting,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SETTING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    console.error("Get admin setting error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve setting",
    });
  }
}

/**
 * PATCH /api/admin/settings
 */
export async function updateAdminSettingsController(
  req: Request,
  res: Response,
) {
  const result = updateSettingsSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings payload",
      errors: result.error.flatten().fieldErrors,
    });
  }

  const adminUserId = getUserId(req);

  if (!adminUserId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const settings = await updateAdminSettings(result.data, adminUserId);

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "NO_SETTINGS_PROVIDED":
          return res.status(400).json({
            success: false,
            message: "No settings provided",
          });

        case "DUPLICATE_SETTING_KEYS":
          return res.status(400).json({
            success: false,
            message: "Duplicate setting keys are not allowed",
          });

        case "SETTING_NOT_FOUND":
          return res.status(404).json({
            success: false,
            message: "One or more settings were not found",
          });

        case "SECRET_SETTING_REQUIRES_DEDICATED_FLOW":
          return res.status(400).json({
            success: false,
            message: "Secret settings require a dedicated credential flow",
          });
      }
    }

    console.error("Update admin settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update settings",
    });
  }
}
