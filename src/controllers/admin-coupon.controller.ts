import type { Request, Response } from "express";
import { z } from "zod";

import {
  createCoupon,
  deleteCoupon,
  getCouponById,
  getCoupons,
  updateCoupon,
} from "../services/coupon.service.js";

const couponSchema = z.object({
  code: z.string().trim().min(3).max(50),
  description: z.string().trim().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

const updateCouponSchema = couponSchema.partial();

function handleCouponError(error: unknown, res: Response) {
  if (!(error instanceof Error)) {
    return false;
  }

  const messages: Record<string, { status: number; message: string }> = {
    COUPON_NOT_FOUND: {
      status: 404,
      message: "Coupon not found",
    },
    COUPON_ALREADY_EXISTS: {
      status: 409,
      message: "A coupon with this code already exists",
    },
    INVALID_COUPON_CODE: {
      status: 400,
      message: "Invalid coupon code",
    },
    INVALID_DISCOUNT_VALUE: {
      status: 400,
      message: "Invalid discount value",
    },
    INVALID_PERCENTAGE: {
      status: 400,
      message: "Percentage discount cannot exceed 100",
    },
    INVALID_MAX_DISCOUNT: {
      status: 400,
      message: "Invalid maximum discount",
    },
    INVALID_MIN_ORDER_AMOUNT: {
      status: 400,
      message: "Invalid minimum order amount",
    },
    INVALID_USAGE_LIMIT: {
      status: 400,
      message: "Invalid usage limit",
    },
    INVALID_PER_USER_LIMIT: {
      status: 400,
      message: "Invalid per-user usage limit",
    },
    INVALID_COUPON_DATES: {
      status: 400,
      message: "Coupon expiry must be after its start date",
    },
  };

  const response = messages[error.message];

  if (!response) {
    return false;
  }

  res.status(response.status).json({
    success: false,
    message: response.message,
  });

  return true;
}

export async function listAdminCoupons(req: Request, res: Response) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  try {
    const result = await getCoupons(page, limit);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("List coupons error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve coupons",
    });
  }
}

export async function getAdminCoupon(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Coupon ID is required",
    });
  }

  try {
    const coupon = await getCouponById(id);

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    if (handleCouponError(error, res)) {
      return;
    }

    console.error("Get coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve coupon",
    });
  }
}

export async function createAdminCoupon(req: Request, res: Response) {
  const result = couponSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid coupon data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const coupon = await createCoupon(result.data);

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    if (handleCouponError(error, res)) {
      return;
    }

    console.error("Create coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create coupon",
    });
  }
}

export async function updateAdminCoupon(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Coupon ID is required",
    });
  }

  const result = updateCouponSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid coupon data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const coupon = await updateCoupon(id, result.data);

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    if (handleCouponError(error, res)) {
      return;
    }

    console.error("Update coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update coupon",
    });
  }
}

export async function deleteAdminCoupon(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Coupon ID is required",
    });
  }

  try {
    await deleteCoupon(id);

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    if (handleCouponError(error, res)) {
      return;
    }

    console.error("Delete coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete coupon",
    });
  }
}
