import {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

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
};

export type UserOrderListOptions = {
  page: number;
  limit: number;
  status?: OrderStatus;
};

/*
 * Creates an order and updates product stock inside one
 * database transaction.
 *
 * If any operation fails, the entire transaction is rolled back.
 */
export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new Error("ORDER_ITEMS_REQUIRED");
  }

  /*
   * Merge duplicate product IDs before touching the database.
   *
   * This prevents the same product from appearing multiple times
   * in one order and makes stock calculation predictable.
   */
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
    /*
     * The address must belong to the authenticated user.
     *
     * We fetch it inside the transaction so the order always uses
     * an address that belongs to this customer.
     */
    const address = await tx.address.findFirst({
      where: {
        id: input.addressId,
        userId: input.userId,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    /*
     * Store the address as a snapshot on the order.
     *
     * Future changes to the customer's saved address will not
     * modify the historical shipping information on this order.
     */
    const shippingDetails: Prisma.InputJsonValue = {
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      country: address.country,
    };

    /*
     * Use Prisma.Decimal for all money calculations.
     *
     * JavaScript numbers can introduce floating-point errors,
     * which we don't want for prices and order totals.
     */
    let subtotal = new Prisma.Decimal(0);

    const orderItems: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
    }[] = [];

    /*
     * Validate every product before creating the order.
     */
    for (const item of normalizedItems) {
      if (item.quantity <= 0) {
        throw new Error("INVALID_QUANTITY");
      }

      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      if (!product || !product.isActive) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (product.stock < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.id}`);
      }

      const unitPrice = product.price;

      const itemSubtotal = unitPrice.mul(item.quantity);

      subtotal = subtotal.add(itemSubtotal);

      /*
       * Store the product's current information as a snapshot.
       *
       * If the product price changes later, historical orders
       * will still contain the original purchase price.
       */
      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    const shippingCost = new Prisma.Decimal(0);
    const discount = new Prisma.Decimal(0);
    const tax = new Prisma.Decimal(0);

    const total = subtotal.add(shippingCost).sub(discount).add(tax);

    /*
     * Temporary order number.
     *
     * We'll eventually move this into a dedicated order-number
     * generator so collisions are impossible.
     */
    const orderNumber = `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
     * Reduce stock after the order items have been created.
     *
     * Everything is still inside the same transaction.
     */
    for (const item of orderItems) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    /*
     * Remove the purchased products from the user's cart.
     *
     * This happens inside the same transaction as the order and
     * stock update. If anything fails, the cart is also preserved.
     */
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

/*
 * Returns orders belonging only to the authenticated user.
 *
 * We filter by userId in the database query itself, so a customer
 * cannot retrieve another customer's orders by changing an ID.
 */
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

/*
 * Returns one order only when it belongs to the authenticated user.
 */
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

/*
 * Cancels an order belonging to the authenticated user.
 *
 * Cancellation and stock restoration happen inside one transaction.
 * This prevents the order from being cancelled while stock restoration
 * fails halfway through.
 */
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

    /*
     * Customers can only cancel orders while they are pending.
     *
     * Once processing begins, the order has entered fulfillment
     * and can no longer be cancelled through the customer API.
     */
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

    /*
     * Return the purchased quantity to product stock.
     */
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
