import { prisma } from "../lib/prisma.js";

/*
 * Returns active categories.
 *
 * parentId allows the frontend to reconstruct the category tree
 * without needing a separate request for every parent category.
 */
export async function getCategories() {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  });
}
