import { prisma } from "../lib/prisma.js";

export type CreateReviewInput = {
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
};

/*
 * Creates a review for a product.
 *
 * A customer must have purchased the product before they can
 * review it. The review starts unapproved and therefore does not
 * immediately affect the public product rating.
 */
export async function createReview(input: CreateReviewInput) {
  const product = await prisma.product.findUnique({
    where: {
      id: input.productId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!product || !product.isActive) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  /*
   * Check whether the customer has purchased this product.
   *
   * We intentionally check OrderItem rather than relying on the
   * current cart or product ownership.
   */
  const purchasedItem = await prisma.orderItem.findFirst({
    where: {
      productId: input.productId,
      order: {
        userId: input.userId,
        status: {
          in: ["PROCESSING", "SHIPPED", "DELIVERED"],
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!purchasedItem) {
    throw new Error("PRODUCT_NOT_PURCHASED");
  }

  /*
   * Prevent the same customer from reviewing the same product
   * multiple times.
   */
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: input.userId,
      productId: input.productId,
    },
    select: {
      id: true,
    },
  });

  if (existingReview) {
    throw new Error("REVIEW_ALREADY_EXISTS");
  }

  return prisma.review.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,

      /*
       * We know the customer purchased the product, but the review
       * still requires admin approval before becoming public.
       */
      isVerified: true,
      isApproved: false,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

/*
 * Returns approved reviews for a product.
 *
 * Only admin-approved reviews are exposed publicly.
 */
export async function getProductReviews(productId: string) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return prisma.review.findMany({
    where: {
      productId,
      isApproved: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      isVerified: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/*
 * Returns all reviews submitted by the authenticated customer.
 */
export async function getUserReviews(userId: string) {
  return prisma.review.findMany({
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
          images: true,
        },
      },
    },
  });
}
