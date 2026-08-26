import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

/*
 * PC Builder component types.
 *
 * We keep these inside product specifications instead of creating
 * separate CPU/GPU/RAM/etc. database tables. This keeps the
 * database smaller and lets the normal product catalog remain
 * the single source of truth.
 */
export const PC_COMPONENT_TYPES = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "COOLER",
  "CASE",
] as const;

export type PCComponentType = (typeof PC_COMPONENT_TYPES)[number];

export type PCComponentSpecs = {
  componentType: PCComponentType;

  socket?: string;
  ramType?: string;
  formFactor?: string;
  chipset?: string;

  capacity?: number;
  speed?: number;

  vram?: number;
  tdp?: number;

  power?: number;

  gpuLength?: number;
  gpuClearance?: number;

  coolerSocket?: string[];
  coolerTdp?: number;

  storageType?: string;
};

export type ProductWithSpecs = {
  id: string;
  name: string;
  slug: string;
  price: Prisma.Decimal;
  specifications: unknown;
};

export type CompatibilityProduct = {
  id: string;
  name: string;
  slug: string;
  specifications: unknown;
};

function getSpecs(product: CompatibilityProduct): PCComponentSpecs | null {
  if (
    !product.specifications ||
    typeof product.specifications !== "object" ||
    Array.isArray(product.specifications)
  ) {
    return null;
  }

  const specs = product.specifications as Record<string, unknown>;

  if (typeof specs.componentType !== "string") {
    return null;
  }

  return specs as unknown as PCComponentSpecs;
}

/*
 * Returns products that are usable by the PC Builder.
 */
export async function getBuilderComponents(componentType?: PCComponentType) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      specifications: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return products.filter((product) => {
    const specs = getSpecs({
      id: product.id,
      name: product.name,
      slug: product.slug,
      specifications: product.specifications,
    });

    if (!specs) {
      return false;
    }

    if (!componentType) {
      return true;
    }

    return specs.componentType === componentType;
  });
}

/*
 * Checks compatibility between the selected PC components.
 *
 * The engine is intentionally rule-based. Adding a new compatibility
 * rule later should only require changing this function.
 */
export function checkCompatibility(components: CompatibilityProduct[]) {
  const parsed = components
    .map((product) => ({
      product,
      specs: getSpecs(product),
    }))
    .filter(
      (
        item,
      ): item is {
        product: ProductWithSpecs;
        specs: PCComponentSpecs;
      } => item.specs !== null,
    );

  const issues: string[] = [];
  const warnings: string[] = [];

  /*
   * Each PC component slot can only contain one component.
   *
   * Example:
   * CPU + CPU is invalid.
   * GPU + GPU is invalid.
   */
  const componentCounts = new Map<PCComponentType, number>();

  for (const item of parsed) {
    const type = item.specs.componentType;

    componentCounts.set(type, (componentCounts.get(type) ?? 0) + 1);
  }

  for (const [type, count] of componentCounts) {
    if (count > 1) {
      issues.push(`A build can only contain one ${type}.`);
    }
  }

  const find = (type: PCComponentType) =>
    parsed.find((item) => item.specs.componentType === type);

  const cpu = find("CPU");
  const motherboard = find("MOTHERBOARD");
  const ram = find("RAM");
  const gpu = find("GPU");
  const psu = find("PSU");
  const cooler = find("COOLER");
  const pcCase = find("CASE");

  // CPU ↔ Motherboard
  if (
    cpu?.specs.socket &&
    motherboard?.specs.socket &&
    cpu.specs.socket !== motherboard.specs.socket
  ) {
    issues.push(
      `CPU socket ${cpu.specs.socket} is not compatible with motherboard socket ${motherboard.specs.socket}.`,
    );
  }

  // Motherboard ↔ RAM
  if (
    motherboard?.specs.ramType &&
    ram?.specs.ramType &&
    motherboard.specs.ramType !== ram.specs.ramType
  ) {
    issues.push(
      `Motherboard requires ${motherboard.specs.ramType} RAM, but selected RAM is ${ram.specs.ramType}.`,
    );
  }

  // Motherboard ↔ Case
  if (motherboard?.specs.formFactor && pcCase?.specs.formFactor) {
    const supportedFormFactors = pcCase.specs.formFactor
      .split(",")
      .map((value) => value.trim());

    if (!supportedFormFactors.includes(motherboard.specs.formFactor)) {
      issues.push(
        `The ${motherboard.specs.formFactor} motherboard does not fit the selected case.`,
      );
    }
  }

  // GPU ↔ Case clearance
  if (
    gpu?.specs.gpuLength !== undefined &&
    pcCase?.specs.gpuClearance !== undefined &&
    gpu.specs.gpuLength > pcCase.specs.gpuClearance
  ) {
    issues.push(
      `GPU length ${gpu.specs.gpuLength}mm exceeds the case clearance of ${pcCase.specs.gpuClearance}mm.`,
    );
  }

  // CPU ↔ Cooler
  if (
    cpu?.specs.socket &&
    cooler?.specs.coolerSocket &&
    !cooler.specs.coolerSocket.includes(cpu.specs.socket)
  ) {
    issues.push(
      `The selected CPU cooler does not support ${cpu.specs.socket}.`,
    );
  }

  /*
   * Basic PSU calculation.
   *
   * CPU TDP + GPU TDP + 150W system overhead.
   * This is intentionally conservative for the MVP.
   */
  const cpuPower = cpu?.specs.tdp ?? 0;
  const gpuPower = gpu?.specs.tdp ?? 0;

  const estimatedPower = cpuPower + gpuPower + 150;

  if (psu?.specs.power !== undefined) {
    if (psu.specs.power < estimatedPower) {
      issues.push(
        `Selected PSU is ${psu.specs.power}W, but estimated system requirement is around ${estimatedPower}W.`,
      );
    } else if (psu.specs.power < estimatedPower + 100) {
      warnings.push(
        "PSU has limited headroom. A higher-wattage PSU is recommended.",
      );
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
    warnings,
  };
}
