import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type AdminSettingsSection =
  | "store"
  | "orders"
  | "inventory"
  | "shipping"
  | "payments"
  | "notifications"
  | "security";

export type AdminSetting = {
  id: string;
  key: string;
  value: unknown;
  section: string;
  description: string | null;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateAdminSettingInput = {
  key: string;
  value: unknown;
};

export type UpdateAdminSettingsInput = {
  settings: UpdateAdminSettingInput[];
};

const VALID_SECTIONS: AdminSettingsSection[] = [
  "store",
  "orders",
  "inventory",
  "shipping",
  "payments",
  "notifications",
  "security",
];

function isValidSection(section: string): section is AdminSettingsSection {
  return VALID_SECTIONS.includes(section as AdminSettingsSection);
}

/**
 * Get all settings.
 *
 * Secret settings are returned with their value hidden.
 */
export async function getAdminSettings(section?: string) {
  const where: Prisma.SystemSettingWhereInput = section ? { section } : {};

  const settings = await prisma.systemSetting.findMany({
    where,
    orderBy: [
      {
        section: "asc",
      },
      {
        key: "asc",
      },
    ],
  });

  return settings.map((setting) => ({
    ...setting,
    value: setting.isSecret ? null : setting.value,
  }));
}

/**
 * Get one setting by key.
 */
export async function getAdminSetting(key: string) {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new Error("SETTING_NOT_FOUND");
  }

  return {
    ...setting,
    value: setting.isSecret ? null : setting.value,
  };
}

/**
 * Update multiple settings in one transaction.
 *
 * Only existing settings can be updated.
 * This prevents arbitrary keys from being inserted
 * through the admin API.
 */
export async function updateAdminSettings(
  input: UpdateAdminSettingsInput,
  adminUserId: string,
) {
  if (input.settings.length === 0) {
    throw new Error("NO_SETTINGS_PROVIDED");
  }

  const keys = input.settings.map((setting) => setting.key);

  const uniqueKeys = new Set(keys);

  if (uniqueKeys.size !== keys.length) {
    throw new Error("DUPLICATE_SETTING_KEYS");
  }

  const existingSettings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: keys,
      },
    },
  });

  if (existingSettings.length !== input.settings.length) {
    throw new Error("SETTING_NOT_FOUND");
  }

  const existingByKey = new Map(
    existingSettings.map((setting) => [setting.key, setting]),
  );

  /*
   * Secret settings cannot be overwritten through
   * the normal settings endpoint.
   *
   * They need a dedicated credential/integration
   * flow later.
   */
  for (const setting of input.settings) {
    const existing = existingByKey.get(setting.key);

    if (!existing) {
      throw new Error("SETTING_NOT_FOUND");
    }

    if (existing.isSecret) {
      throw new Error("SECRET_SETTING_REQUIRES_DEDICATED_FLOW");
    }
  }

  const updatedSettings = await prisma.$transaction(async (tx) => {
    const updated = [];

    for (const setting of input.settings) {
      const existing = existingByKey.get(setting.key);

      if (!existing) {
        throw new Error("SETTING_NOT_FOUND");
      }

      const updatedSetting = await tx.systemSetting.update({
        where: {
          key: setting.key,
        },
        data: {
          value: setting.value as Prisma.InputJsonValue,
        },
      });

      updated.push(updatedSetting);

      await tx.adminActivity.create({
        data: {
          userId: adminUserId,
          action: "SETTING_UPDATED",
          entityType: "SETTINGS",
          entityId: updatedSetting.id,
          metadata: {
            key: updatedSetting.key,
            section: updatedSetting.section,
            previousValue: existing.value,
            newValue: updatedSetting.value,
          } satisfies Prisma.InputJsonValue,
        },
      });
    }

    return updated;
  });

  return updatedSettings.map((setting) => ({
    ...setting,
    value: setting.isSecret ? null : setting.value,
  }));
}

/**
 * Validate a settings section.
 */
export function validateSettingsSection(section: string) {
  return isValidSection(section);
}
