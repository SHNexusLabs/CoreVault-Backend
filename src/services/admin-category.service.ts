import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

export type CreateCategoryInput = {
  name: string;
  slug: string;
  parentId?: string | null;
  isActive?: boolean;
};

export async function createCategory(input: CreateCategoryInput) {
  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("CATEGORY_ALREADY_EXISTS");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new Error("INVALID_PARENT_CATEGORY");
    }

    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: Partial<CreateCategoryInput>,
) {
  try {
    return await prisma.category.update({
      where: {
        id,
      },
      data: input,
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new Error("CATEGORY_NOT_FOUND");
      }

      if (error.code === "P2002") {
        throw new Error("CATEGORY_ALREADY_EXISTS");
      }

      if (error.code === "P2003") {
        throw new Error("INVALID_PARENT_CATEGORY");
      }
    }

    throw error;
  }
}

/*
 * Soft delete keeps existing products safe because they may
 * still reference this category.
 */
export async function deleteCategory(id: string) {
  try {
    return await prisma.category.update({
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
      throw new Error("CATEGORY_NOT_FOUND");
    }

    throw error;
  }
}

export async function getAdminCategories() {
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
      isActive: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}
