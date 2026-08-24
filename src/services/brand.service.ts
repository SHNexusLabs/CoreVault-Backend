import { prisma } from "../lib/prisma.js";

/*
 * Returns active brands for product filters and admin product forms.
 */
export async function getBrands() {
  return prisma.brand.findMany({
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
      logo: true,
    },
  });
}
