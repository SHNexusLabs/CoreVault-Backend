import { checkCompatibility } from "./pc-builder.service.js";

const cpu = {
  id: "cpu-1",
  name: "Ryzen 7 9700X",
  slug: "ryzen-7-9700x",
  price: 300,
  specifications: {
    componentType: "CPU",
    socket: "AM5",
    tdp: 65,
  },
};

const motherboard = {
  id: "mb-1",
  name: "B650 Motherboard",
  slug: "b650",
  price: 150,
  specifications: {
    componentType: "MOTHERBOARD",
    socket: "AM5",
    ramType: "DDR5",
    formFactor: "ATX",
  },
};

const incompatibleMotherboard = {
  ...motherboard,
  specifications: {
    componentType: "MOTHERBOARD",
    socket: "LGA1700",
    ramType: "DDR5",
    formFactor: "ATX",
  },
};

const ram = {
  id: "ram-1",
  name: "32GB DDR5",
  slug: "32gb-ddr5",
  price: 100,
  specifications: {
    componentType: "RAM",
    ramType: "DDR5",
    capacity: 32,
    speed: 6000,
  },
};

const gpu = {
  id: "gpu-1",
  name: "RX 9070 XT",
  slug: "rx-9070-xt",
  price: 700,
  specifications: {
    componentType: "GPU",
    tdp: 300,
    gpuLength: 330,
    vram: 16,
  },
};

const weakPsu = {
  id: "psu-1",
  name: "450W PSU",
  slug: "450w-psu",
  price: 60,
  specifications: {
    componentType: "PSU",
    power: 450,
  },
};

const goodPsu = {
  id: "psu-2",
  name: "750W PSU",
  slug: "750w-psu",
  price: 100,
  specifications: {
    componentType: "PSU",
    power: 750,
  },
};

const compatibleCase = {
  id: "case-1",
  name: "ATX Case",
  slug: "atx-case",
  price: 80,
  specifications: {
    componentType: "CASE",
    formFactor: "ATX,Micro-ATX,Mini-ITX",
    gpuClearance: 360,
  },
};

/*
 * Test 1:
 * AM5 CPU + AM5 motherboard should work.
 */
const validBuild = checkCompatibility([
  cpu,
  motherboard,
  ram,
  gpu,
  goodPsu,
  compatibleCase,
]);

console.assert(
  validBuild.compatible === true,
  "Test 1 failed: valid build should be compatible",
);

/*
 * Test 2:
 * AM5 CPU + LGA1700 motherboard should fail.
 */
const wrongSocketBuild = checkCompatibility([cpu, incompatibleMotherboard]);

console.assert(
  wrongSocketBuild.compatible === false,
  "Test 2 failed: incompatible CPU/motherboard should fail",
);

/*
 * Test 3:
 * Weak PSU should fail.
 */
const weakPsuBuild = checkCompatibility([cpu, motherboard, gpu, weakPsu]);

console.assert(
  weakPsuBuild.compatible === false,
  "Test 3 failed: weak PSU should fail",
);

/*
 * Test 4:
 * Duplicate component types should fail.
 */
const duplicateCpuBuild = checkCompatibility([
  cpu,
  {
    ...cpu,
    id: "cpu-2",
    name: "Another CPU",
  },
]);

console.assert(
  duplicateCpuBuild.compatible === false,
  "Test 4 failed: duplicate CPU should fail",
);

console.log("PC Builder compatibility tests passed.");
