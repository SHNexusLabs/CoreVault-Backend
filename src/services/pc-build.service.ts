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

type ComponentSlot = {
  field: keyof PCBuildComponents;
  expectedType: string;
};

const COMPONENT_SLOTS: ComponentSlot[] = [
  {
    field: "cpuId",
    expectedType: "CPU",
  },
  {
    field: "motherboardId",
    expectedType: "MOTHERBOARD",
  },
  {
    field: "ramId",
    expectedType: "RAM",
  },
  {
    field: "gpuId",
    expectedType: "GPU",
  },
  {
    field: "storageId",
    expectedType: "STORAGE",
  },
  {
    field: "psuId",
    expectedType: "PSU",
  },
  {
    field: "coolerId",
    expectedType: "COOLER",
  },
  {
    field: "caseId",
    expectedType: "CASE",
  },
];

/* Validates all selected products before saving a build. */
async function validateBuildComponents(components: PCBuildComponents) {
  const selected = COMPONENT_SLOTS.map((slot) => ({
    ...slot,
    productId: components[slot.field],
  })).filter(
    (slot): slot is ComponentSlot & { productId: string } =>
      typeof slot.productId === "string",
  );

  if (selected.length === 0) {
    return;
  }

  const productIds = selected.map((component) => component.productId);

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      specifications: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const component of selected) {
    const product = productMap.get(component.productId);

    if (!product) {
      throw new Error("PC_COMPONENT_NOT_FOUND");
    }

    if (
      !product.specifications ||
      typeof product.specifications !== "object" ||
      Array.isArray(product.specifications)
    ) {
      throw new Error("INVALID_PC_COMPONENT");
    }

    const specifications = product.specifications as {
      componentType?: unknown;
    };

    if (specifications.componentType !== component.expectedType) {
      throw new Error(`INVALID_PC_COMPONENT_TYPE:${component.field}`);
    }
  }
}

/* Creates a saved PC build for the authenticated user. */
export async function createPCBuild(
  userId: string,
  name: string,
  components: PCBuildComponents,
) {
  await validateBuildComponents(components);

  return prisma.pCBuild.create({
    data: {
      userId,
      name,
      components,
    },
  });
}

/* Returns only builds belonging to the authenticated user. */
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

/* Retrieves one build while enforcing ownership. */
export async function getPCBuild(userId: string, id: string) {
  return prisma.pCBuild.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/* Updates only a build owned by the authenticated user. */
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

  /* Validate newly supplied components. */
  if (data.components) {
    await validateBuildComponents(data.components);
  }

  return prisma.pCBuild.update({
    where: {
      id,
    },
    data,
  });
}

/* Deletes only a build owned by the authenticated user. */
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
