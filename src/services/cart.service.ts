import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

/*
 * Returns the authenticated user's cart.
 *
 * Product information is included so the frontend can render
 * the cart without making a separate request for every item.
 */
export async function getCart(userId: string) {
  return prisma.cart.findUnique({
    where: {
      userId,
    },
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              sku: true,
              price: true,
              comparePrice: true,
              stock: true,
              images: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
}

/*
 * Adds a product to the user's cart.
 *
 * If the product is already there, its quantity is increased
 * instead of creating a duplicate cart item.
 */
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    throw new Error("INVALID_QUANTITY");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        isActive: true,
        stock: true,
      },
    });

    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    if (product.stock < quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    const cart = await tx.cart.upsert({
      where: {
        userId,
      },
      create: {
        userId,
      },
      update: {},
    });

    const existingItem = await tx.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + quantity;

    if (newQuantity > product.stock) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await tx.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      update: {
        quantity: newQuantity,
      },
    });

    return tx.cart.findUnique({
      where: {
        id: cart.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                price: true,
                comparePrice: true,
                stock: true,
                images: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  });
}

/*
 * Updates the quantity of an existing cart item.
 */
export async function updateCartItem(
  userId: string,
  productId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    throw new Error("INVALID_QUANTITY");
  }

  const cart = await prisma.cart.findUnique({
    where: {
      userId,
    },
  });

  if (!cart) {
    throw new Error("CART_NOT_FOUND");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      isActive: true,
      stock: true,
    },
  });

  if (!product || !product.isActive) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (quantity > product.stock) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  if (!item) {
    throw new Error("CART_ITEM_NOT_FOUND");
  }

  await prisma.cartItem.update({
    where: {
      id: item.id,
    },
    data: {
      quantity,
    },
  });

  return getCart(userId);
}

/*
 * Removes one product from the cart.
 */
export async function removeFromCart(userId: string, productId: string) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId,
    },
  });

  if (!cart) {
    throw new Error("CART_NOT_FOUND");
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  if (!item) {
    throw new Error("CART_ITEM_NOT_FOUND");
  }

  await prisma.cartItem.delete({
    where: {
      id: item.id,
    },
  });

  return getCart(userId);
}

/*
 * Removes every item from the user's cart.
 *
 * The cart itself remains so the same cart can be reused.
 */
export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId,
    },
  });

  if (!cart) {
    return null;
  }

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });

  return getCart(userId);
}
