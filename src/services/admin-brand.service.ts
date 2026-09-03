import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type CreateBrandInput = {
  name: string;
  slug: string;
  logo?: string;
  isActive?: boolean;
};

/* Creates a brand. */
export async function createBrand(input: CreateBrandInput) {
  try {
    return await prisma.brand.create({
      data: {
        name: input.name,
        slug: input.slug,
        logo: input.logo,
        isActive: input.isActive ?? true,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("BRAND_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function updateBrand(
  id: string,
  input: Partial<CreateBrandInput>,
) {
  try {
    return await prisma.brand.update({
      where: {
        id,
      },
      data: input,
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new Error("BRAND_NOT_FOUND");
      }

      if (error.code === "P2002") {
        throw new Error("BRAND_ALREADY_EXISTS");
      }
    }

    throw error;
  }
}

/* Soft delete the brand instead of physically deleting it. */
export async function deleteBrand(id: string) {
  try {
    return await prisma.brand.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error("BRAND_NOT_FOUND");
    }

    throw error;
  }
}

export async function getAdminBrands() {
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
      isActive: true,
    },
  });
}
