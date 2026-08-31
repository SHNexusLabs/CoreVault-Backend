import {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { validateCouponWithTransaction } from "./coupon.service.js";

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
};

export type CreateOrderInput = {
  userId: string;
  items: CreateOrderItemInput[];
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  addressId: string;
  couponCode?: string;
};

export type UserOrderListOptions = {
  page: number;
  limit: number;
  status?: OrderStatus;
};

/* Creates an order and updates product stock */
export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new Error("ORDER_ITEMS_REQUIRED");
  }

  /* Merge duplicate product IDs before touching the database */
  const mergedItems = new Map<string, number>();

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new Error("INVALID_QUANTITY");
    }

    mergedItems.set(
      item.productId,
      (mergedItems.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const normalizedItems = Array.from(mergedItems.entries()).map(
    ([productId, quantity]) => ({
      productId,
      quantity,
    }),
  );

  return prisma.$transaction(async (tx) => {
    /* The address must belong to the authenticated user. */
    const address = await tx.address.findFirst({
      where: {
        id: input.addressId,
        userId: input.userId,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    /* Save a snapshot of the shipping address. */
    const shippingDetails: Prisma.InputJsonValue = {
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      country: address.country,
    };

    let subtotal = new Prisma.Decimal(0);

    const orderItems: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
    }[] = [];

    for (const item of normalizedItems) {
      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          isActive: true,
        },
      });

      if (!product || !product.isActive) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const itemSubtotal = product.price.mul(item.quantity);

      subtotal = subtotal.add(itemSubtotal);

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    /* Atomically reserve/decrement stock. */
    for (const item of orderItems) {
      const stockUpdate = await tx.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (stockUpdate.count === 0) {
        throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
      }
    }

    const shippingCost = new Prisma.Decimal(0);
    const tax = new Prisma.Decimal(0);

    let discount = new Prisma.Decimal(0);
    let appliedCouponId: string | null = null;

    if (input.couponCode) {
      const couponResult = await validateCouponWithTransaction(
        tx,
        input.couponCode,
        input.userId,
        subtotal,
      );

      discount = couponResult.discount;
      appliedCouponId = couponResult.coupon.id;
    }

    const total = subtotal.add(shippingCost).sub(discount).add(tax);
    /* Temporary order number. */
    const orderNumber = `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    /* Create the order only after stock has been successfully reserved for every product. */
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,

        status: "PENDING",
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        deliveryMethod: input.deliveryMethod,

        subtotal,
        shippingCost,
        discount,
        tax,
        total,

        shippingDetails,

        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        },
      },

      include: {
        items: true,
      },
    });

    /*
     Record coupon usage only after the order exists.
     This remains inside the same transaction, so if anything
     fails later, the coupon usage is rolled back too.
     */
    if (appliedCouponId) {
      await tx.couponUsage.create({
        data: {
          couponId: appliedCouponId,
          userId: input.userId,
          orderId: order.id,
          amount: discount,
        },
      });

      await tx.coupon.update({
        where: {
          id: appliedCouponId,
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    /* Remove purchased products from the customer's cart. */
    await tx.cartItem.deleteMany({
      where: {
        cart: {
          userId: input.userId,
        },
        productId: {
          in: normalizedItems.map((item) => item.productId),
        },
      },
    });

    return order;
  });
}

/* Returns orders belonging only to the authenticated user. */
export async function getUserOrders(
  userId: string,
  options: UserOrderListOptions,
) {
  const { page, limit, status } = options;

  const where = {
    userId,
    ...(status ? { status } : {}),
  };

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            sku: true,
            unitPrice: true,
            quantity: true,
            subtotal: true,
          },
        },
      },
    }),

    prisma.order.count({
      where,
    }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* Returns one order only when it belongs to the authenticated user. */
export async function getUserOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return order;
}

/* Cancels an order belonging to the authenticated user. */
export async function cancelOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    /* Customers can only cancel orders while they are pending. */
    if (order.status !== "PENDING") {
      throw new Error("ORDER_CANNOT_BE_CANCELLED");
    }

    const updatedOrder = await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        items: true,
      },
    });

    /* Return the purchased quantity to product stock. */
    for (const item of order.items) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    return updatedOrder;
  });
}
