import { CouponDiscountType, Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type CreateCouponInput = {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
};

export type UpdateCouponInput = Partial<CreateCouponInput>;

type PrismaTransaction = Prisma.TransactionClient;

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function decimal(value: number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

function validateCouponInput(
  input: CreateCouponInput | UpdateCouponInput,
) {
  if (input.code !== undefined) {
    const code = normalizeCode(input.code);

    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
      throw new Error("INVALID_COUPON_CODE");
    }
  }

  if (
    input.discountValue !== undefined &&
    (!Number.isFinite(input.discountValue) ||
      input.discountValue <= 0)
  ) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (
    input.discountType === CouponDiscountType.PERCENTAGE &&
    input.discountValue !== undefined &&
    input.discountValue > 100
  ) {
    throw new Error("INVALID_PERCENTAGE");
  }

  if (
    input.maxDiscount !== undefined &&
    (!Number.isFinite(input.maxDiscount) ||
      input.maxDiscount <= 0)
  ) {
    throw new Error("INVALID_MAX_DISCOUNT");
  }

  if (
    input.minOrderAmount !== undefined &&
    (!Number.isFinite(input.minOrderAmount) ||
      input.minOrderAmount < 0)
  ) {
    throw new Error("INVALID_MIN_ORDER_AMOUNT");
  }

  if (
    input.usageLimit !== undefined &&
    (!Number.isInteger(input.usageLimit) ||
      input.usageLimit <= 0)
  ) {
    throw new Error("INVALID_USAGE_LIMIT");
  }

  if (
    input.perUserLimit !== undefined &&
    (!Number.isInteger(input.perUserLimit) ||
      input.perUserLimit <= 0)
  ) {
    throw new Error("INVALID_PER_USER_LIMIT");
  }

  if (
    input.startsAt &&
    input.expiresAt &&
    input.expiresAt <= input.startsAt
  ) {
    throw new Error("INVALID_COUPON_DATES");
  }
}

/*
 * Creates a coupon.
 */
export async function createCoupon(input: CreateCouponInput) {
  validateCouponInput(input);

  const code = normalizeCode(input.code);

  const existing = await prisma.coupon.findUnique({
    where: {
      code,
    },
  });

  if (existing) {
    throw new Error("COUPON_ALREADY_EXISTS");
  }

  return prisma.coupon.create({
    data: {
      code,
      description: input.description?.trim() || null,
      discountType: input.discountType,
      discountValue: decimal(input.discountValue),

      maxDiscount:
        input.maxDiscount !== undefined
          ? decimal(input.maxDiscount)
          : null,

      minOrderAmount:
        input.minOrderAmount !== undefined
          ? decimal(input.minOrderAmount)
          : null,

      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

/*
 * Returns paginated coupons.
 */
export async function getCoupons(
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.coupon.count(),
  ]);

  return {
    coupons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * Returns one coupon.
 */
export async function getCouponById(id: string) {
  const coupon = await prisma.coupon.findUnique({
    where: {
      id,
    },
  });

  if (!coupon) {
    throw new Error("COUPON_NOT_FOUND");
  }

  return coupon;
}

/*
 * Updates a coupon.
 */
export async function updateCoupon(
  id: string,
  input: UpdateCouponInput,
) {
  validateCouponInput(input);

  const existing = await prisma.coupon.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    throw new Error("COUPON_NOT_FOUND");
  }

  const code =
    input.code !== undefined
      ? normalizeCode(input.code)
      : undefined;

  if (code && code !== existing.code) {
    const duplicate = await prisma.coupon.findUnique({
      where: {
        code,
      },
    });

    if (duplicate) {
      throw new Error("COUPON_ALREADY_EXISTS");
    }
  }

  const discountType =
    input.discountType ?? existing.discountType;

  const discountValue =
    input.discountValue !== undefined
      ? input.discountValue
      : Number(existing.discountValue);

  if (
    discountType === CouponDiscountType.PERCENTAGE &&
    discountValue > 100
  ) {
    throw new Error("INVALID_PERCENTAGE");
  }

  return prisma.coupon.update({
    where: {
      id,
    },

    data: {
      ...(code !== undefined ? { code } : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description.trim() || null,
          }
        : {}),

      ...(input.discountType !== undefined
        ? {
            discountType: input.discountType,
          }
        : {}),

      ...(input.discountValue !== undefined
        ? {
            discountValue: decimal(
              input.discountValue,
            ),
          }
        : {}),

      ...(input.maxDiscount !== undefined
        ? {
            maxDiscount: decimal(
              input.maxDiscount,
            ),
          }
        : {}),

      ...(input.minOrderAmount !== undefined
        ? {
            minOrderAmount: decimal(
              input.minOrderAmount,
            ),
          }
        : {}),

      ...(input.usageLimit !== undefined
        ? {
            usageLimit: input.usageLimit,
          }
        : {}),

      ...(input.perUserLimit !== undefined
        ? {
            perUserLimit: input.perUserLimit,
          }
        : {}),

      ...(input.startsAt !== undefined
        ? {
            startsAt: input.startsAt,
          }
        : {}),

      ...(input.expiresAt !== undefined
        ? {
            expiresAt: input.expiresAt,
          }
        : {}),

      ...(input.isActive !== undefined
        ? {
            isActive: input.isActive,
          }
        : {}),
    },
  });
}

/*
 * Deletes a coupon.
 */
export async function deleteCoupon(id: string) {
  const existing = await prisma.coupon.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    throw new Error("COUPON_NOT_FOUND");
  }

  await prisma.coupon.delete({
    where: {
      id,
    },
  });
}

/*
 * Transaction-safe coupon validation.
 *
 * This version uses the transaction client supplied by
 * createOrder(), so coupon validation and order creation
 * participate in the same transaction.
 */
export async function validateCouponWithTransaction(
  tx: PrismaTransaction,
  code: string,
  userId: string,
  orderAmount: number | Prisma.Decimal,
) {
  const normalizedCode = normalizeCode(code);
  const amount = decimal(orderAmount);

  const coupon = await tx.coupon.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error("COUPON_NOT_FOUND");
  }

  const now = new Date();

  if (coupon.startsAt && now < coupon.startsAt) {
    throw new Error("COUPON_NOT_STARTED");
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new Error("COUPON_EXPIRED");
  }

  if (
    coupon.minOrderAmount !== null &&
    amount.lessThan(coupon.minOrderAmount)
  ) {
    throw new Error("MIN_ORDER_AMOUNT_NOT_MET");
  }

  /*
   * Lock the coupon row before checking usage.
   *
   * PostgreSQL's FOR UPDATE prevents another transaction
   * from simultaneously consuming the same limited coupon.
   */
  const lockedCoupons = await tx.$queryRaw<
    Array<{
      id: string;
      usage_count: number;
      usage_limit: number | null;
    }>
  >`
    SELECT
      id,
      usage_count,
      usage_limit
    FROM coupons
    WHERE id = ${coupon.id}
    FOR UPDATE
  `;

  const lockedCoupon = lockedCoupons[0];

  if (!lockedCoupon) {
    throw new Error("COUPON_NOT_FOUND");
  }

  if (
    lockedCoupon.usage_limit !== null &&
    lockedCoupon.usage_count >= lockedCoupon.usage_limit
  ) {
    throw new Error("COUPON_USAGE_LIMIT_REACHED");
  }

  if (coupon.perUserLimit !== null) {
    const userUsageCount = await tx.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new Error("COUPON_USER_LIMIT_REACHED");
    }
  }

  let discount: Prisma.Decimal;

  if (
    coupon.discountType ===
    CouponDiscountType.PERCENTAGE
  ) {
    discount = amount
      .mul(coupon.discountValue)
      .div(100);

    if (
      coupon.maxDiscount !== null &&
      discount.greaterThan(coupon.maxDiscount)
    ) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  if (discount.greaterThan(amount)) {
    discount = amount;
  }

  const finalAmount = amount.sub(discount);

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discount,
    finalAmount,
  };
}

/*
 * Public/non-transactional coupon validation endpoint.
 * Used by the checkout UI before the order is created.
 */
export async function validateCoupon(
  code: string,
  userId: string,
  orderAmount: number | Prisma.Decimal,
) {
  return prisma.$transaction(async (tx) => {
    return validateCouponWithTransaction(
      tx,
      code,
      userId,
      orderAmount,
    );
  });
}