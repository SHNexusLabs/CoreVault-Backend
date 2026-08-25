import { prisma } from "../lib/prisma.js";

/*
 * Returns the authenticated user's wishlist.
 *
 * The product relation is included so the frontend receives
 * everything needed to display wishlist cards.
 */
export async function getWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
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
          isOnDeal: true,
          dealStart: true,
          dealEnd: true,
        },
      },
    },
  });
}

/*
 * Adds a product to the user's wishlist.
 *
 * WishlistItem uses (userId, productId) as its composite primary key,
 * so the same product cannot be added twice by the same user.
 */
export async function addToWishlist(userId: string, productId: string) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!product || !product.isActive) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  try {
    await prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
    });
  } catch (error: unknown) {
    /*
     * P2002 means the composite primary key already exists.
     */
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw new Error("ALREADY_IN_WISHLIST");
    }

    throw error;
  }

  return getWishlist(userId);
}

/*
 * Removes one product from the user's wishlist.
 */
export async function removeFromWishlist(userId: string, productId: string) {
  try {
    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      throw new Error("WISHLIST_ITEM_NOT_FOUND");
    }

    throw error;
  }

  return getWishlist(userId);
}

/*
 * Removes every wishlist item belonging to the authenticated user.
 */
export async function clearWishlist(userId: string) {
  await prisma.wishlistItem.deleteMany({
    where: {
      userId,
    },
  });

  return [];
}
