import { prisma } from "../lib/prisma.js";

export type PCBuildComponents = {
  cpuId?: string;
  motherboardId?: string;
  ramId?: string;
  gpuId?: string;
  storageId?: string;
  psuId?: string;
  coolerId?: string;
  caseId?: string;
};

/*
 * Creates a saved PC build for the authenticated user.
 *
 * Components are stored as a JSON snapshot. The actual products
 * remain in the products table and this record only stores the
 * customer's selected product IDs.
 */
export async function createPCBuild(
  userId: string,
  name: string,
  components: PCBuildComponents,
) {
  return prisma.pCBuild.create({
    data: {
      userId,
      name,
      components,
    },
  });
}

/*
 * Returns only builds belonging to the authenticated user.
 */
export async function getUserPCBuilds(userId: string) {
  return prisma.pCBuild.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

/*
 * Retrieves one build while enforcing ownership.
 */
export async function getPCBuild(userId: string, id: string) {
  return prisma.pCBuild.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/*
 * Updates only a build owned by the authenticated user.
 */
export async function updatePCBuild(
  userId: string,
  id: string,
  data: {
    name?: string;
    components?: PCBuildComponents;
  },
) {
  const existing = await prisma.pCBuild.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("PC_BUILD_NOT_FOUND");
  }

  return prisma.pCBuild.update({
    where: {
      id,
    },
    data,
  });
}

/*
 * Deletes only a build owned by the authenticated user.
 */
export async function deletePCBuild(userId: string, id: string) {
  const existing = await prisma.pCBuild.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("PC_BUILD_NOT_FOUND");
  }

  await prisma.pCBuild.delete({
    where: {
      id,
    },
  });
}
