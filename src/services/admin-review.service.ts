import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export async function getAdminReviews() {
  return prisma.review.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
        },
      },
    },
  });
}

export async function updateReviewApproval(
  reviewId: string,
  isApproved: boolean,
) {
  return prisma.$transaction(async (tx) => {
    let review;

    try {
      review = await tx.review.update({
        where: {
          id: reviewId,
        },
        data: {
          isApproved,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("REVIEW_NOT_FOUND");
      }

      throw error;
    }

    /*
     * Recalculate the product rating using only approved reviews.
     */
    const approvedReviews = await tx.review.findMany({
      where: {
        productId: review.productId,
        isApproved: true,
      },
      select: {
        rating: true,
      },
    });

    const reviewCount = approvedReviews.length;

    const totalRating = approvedReviews.reduce(
      (sum, currentReview) => sum + currentReview.rating,
      0,
    );

    const rating =
      reviewCount === 0
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(totalRating).div(reviewCount);

    await tx.product.update({
      where: {
        id: review.productId,
      },
      data: {
        rating,
        reviewCount,
      },
    });

    return review;
  });
}
