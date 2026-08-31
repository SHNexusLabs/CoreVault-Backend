import type { Request, Response } from "express";
import { z } from "zod";

import { validateCoupon } from "../services/coupon.service.js";

const validateCouponSchema = z.object({
  code: z.string().trim().min(3).max(50),
  orderAmount: z.number().nonnegative(),
});

export async function validateCustomerCoupon(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = validateCouponSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid coupon data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const resultData = await validateCoupon(
      result.data.code,
      userId,
      result.data.orderAmount,
    );

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      coupon: resultData.coupon,
      discount: resultData.discount,
      finalAmount: resultData.finalAmount,
    });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        COUPON_NOT_FOUND: "Invalid or inactive coupon",
        COUPON_NOT_STARTED: "This coupon is not active yet",
        COUPON_EXPIRED: "This coupon has expired",
        COUPON_USAGE_LIMIT_REACHED: "This coupon has reached its usage limit",
        COUPON_USER_LIMIT_REACHED:
          "You have already used this coupon the maximum number of times",
        MIN_ORDER_AMOUNT_NOT_MET:
          "The minimum order amount for this coupon has not been met",
      };

      const message = messages[error.message];

      if (message) {
        return res.status(400).json({
          success: false,
          message,
        });
      }
    }

    console.error("Validate coupon error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to validate coupon",
    });
  }
}
