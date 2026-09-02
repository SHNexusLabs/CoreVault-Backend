import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const SEED_TAG = "corevault-dashboard-seed";

function daysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function uuidFromNumber(prefix: string, number: number) {
  const hex = number.toString(16).padStart(12, "0");

  return `${prefix.padStart(8, "0").slice(0, 8)}-0000-0000-0000-${hex}`;
}

const categories = [
  {
    name: "Processors",
    slug: "processors",
  },
  {
    name: "Graphics Cards",
    slug: "graphics-cards",
  },
  {
    name: "Motherboards",
    slug: "motherboards",
  },
  {
    name: "Memory",
    slug: "memory",
  },
  {
    name: "Storage",
    slug: "storage",
  },
  {
    name: "Power Supplies",
    slug: "power-supplies",
  },
];

const brands = [
  "AMD",
  "Intel",
  "NVIDIA",
  "ASUS",
  "MSI",
  "Gigabyte",
  "Corsair",
  "Kingston",
];

type ProductDefinition = [
  name: string,
  slug: string,
  categoryName: string,
  brandName: string,
  price: number,
  stock: number,
];

const productDefinitions: ProductDefinition[] = [
  ["AMD Ryzen 7 9700X", "amd-ryzen-7-9700x", "Processors", "AMD", 34999, 8],
  ["AMD Ryzen 5 7600X", "amd-ryzen-5-7600x", "Processors", "AMD", 21999, 18],
  ["AMD Ryzen 9 9950X", "amd-ryzen-9-9950x", "Processors", "AMD", 54999, 4],
  [
    "Intel Core i7-14700K",
    "intel-core-i7-14700k",
    "Processors",
    "Intel",
    38999,
    12,
  ],
  [
    "Intel Core i5-14600K",
    "intel-core-i5-14600k",
    "Processors",
    "Intel",
    28999,
    2,
  ],

  ["RTX 5070 12GB", "rtx-5070-12gb", "Graphics Cards", "NVIDIA", 64999, 7],
  ["RTX 5080 16GB", "rtx-5080-16gb", "Graphics Cards", "NVIDIA", 109999, 3],
  ["RTX 5090 32GB", "rtx-5090-32gb", "Graphics Cards", "NVIDIA", 219999, 0],
  ["RX 9070 XT 16GB", "rx-9070-xt-16gb", "Graphics Cards", "AMD", 64999, 9],
  ["RX 9060 XT 16GB", "rx-9060-xt-16gb", "Graphics Cards", "AMD", 39999, 1],

  [
    "ASUS TUF Gaming B650-PLUS",
    "asus-tuf-b650-plus",
    "Motherboards",
    "ASUS",
    22999,
    11,
  ],
  [
    "MSI B650M Gaming WiFi",
    "msi-b650m-gaming-wifi",
    "Motherboards",
    "MSI",
    15999,
    6,
  ],
  [
    "Gigabyte B650 AORUS Elite",
    "gigabyte-b650-aorus-elite",
    "Motherboards",
    "Gigabyte",
    19999,
    14,
  ],
  [
    "MSI Z790 Gaming Pro",
    "msi-z790-gaming-pro",
    "Motherboards",
    "MSI",
    24999,
    3,
  ],
  [
    "ASUS ROG STRIX X870-F",
    "asus-rog-strix-x870-f",
    "Motherboards",
    "ASUS",
    38999,
    0,
  ],

  [
    "Corsair Vengeance 32GB DDR5",
    "corsair-vengeance-32gb-ddr5",
    "Memory",
    "Corsair",
    9499,
    25,
  ],
  [
    "Kingston Fury 32GB DDR5",
    "kingston-fury-32gb-ddr5",
    "Memory",
    "Kingston",
    8999,
    17,
  ],
  [
    "Corsair Vengeance 64GB DDR5",
    "corsair-vengeance-64gb-ddr5",
    "Memory",
    "Corsair",
    18999,
    5,
  ],
  [
    "Kingston Fury 16GB DDR5",
    "kingston-fury-16gb-ddr5",
    "Memory",
    "Kingston",
    4999,
    32,
  ],
  [
    "Corsair Dominator 64GB",
    "corsair-dominator-64gb",
    "Memory",
    "Corsair",
    24999,
    2,
  ],

  [
    "Samsung 990 Pro 2TB",
    "samsung-990-pro-2tb",
    "Storage",
    "Samsung",
    15999,
    13,
  ],
  [
    "WD Black SN850X 2TB",
    "wd-black-sn850x-2tb",
    "Storage",
    "Western Digital",
    14999,
    19,
  ],
  ["Crucial P3 Plus 1TB", "crucial-p3-plus-1tb", "Storage", "Crucial", 6999, 4],
  ["Kingston NV3 1TB", "kingston-nv3-1tb", "Storage", "Kingston", 5999, 21],
  [
    "Samsung 990 EVO Plus 4TB",
    "samsung-990-evo-plus-4tb",
    "Storage",
    "Samsung",
    32999,
    0,
  ],

  [
    "Corsair RM850e 850W",
    "corsair-rm850e-850w",
    "Power Supplies",
    "Corsair",
    10999,
    16,
  ],
  [
    "Corsair RM1000e 1000W",
    "corsair-rm1000e-1000w",
    "Power Supplies",
    "Corsair",
    14999,
    8,
  ],
  [
    "ASUS TUF 850W Gold",
    "asus-tuf-850w-gold",
    "Power Supplies",
    "ASUS",
    11999,
    2,
  ],
  [
    "MSI MAG A750GL 750W",
    "msi-mag-a750gl-750w",
    "Power Supplies",
    "MSI",
    8499,
    23,
  ],
  [
    "Gigabyte UD850GM 850W",
    "gigabyte-ud850gm-850w",
    "Power Supplies",
    "Gigabyte",
    9999,
    0,
  ],
];

const customerNames = [
  "Aarav Shah",
  "Vivaan Patel",
  "Aditya Mehta",
  "Arjun Desai",
  "Rohan Joshi",
  "Dhruv Shah",
  "Krish Patel",
  "Yash Mehta",
  "Kunal Desai",
  "Dev Shah",
  "Harsh Patel",
  "Manav Joshi",
  "Rahul Mehta",
  "Akash Shah",
  "Nikhil Patel",
  "Sahil Desai",
  "Aryan Shah",
  "Rudra Patel",
  "Ishaan Mehta",
  "Ved Joshi",
  "Kabir Shah",
  "Reyansh Patel",
  "Anay Mehta",
  "Parth Desai",
  "Om Shah",
];

const cities = [
  ["Surat", "Gujarat", "395007"],
  ["Ahmedabad", "Gujarat", "380001"],
  ["Vadodara", "Gujarat", "390001"],
  ["Mumbai", "Maharashtra", "400001"],
  ["Pune", "Maharashtra", "411001"],
  ["Bengaluru", "Karnataka", "560001"],
  ["Delhi", "Delhi", "110001"],
  ["Hyderabad", "Telangana", "500001"],
];

const reviewComments = [
  "Excellent product and very fast delivery.",
  "Works exactly as expected.",
  "Great performance for the price.",
  "Packaging was excellent.",
  "Very happy with the purchase.",
  "Product quality is excellent.",
  "Fast shipping and genuine product.",
  "Would definitely recommend this.",
];

async function main() {
  console.log("🌱 Starting CoreVault dashboard seed...\n");

  /*
   * ------------------------------------------------------------
   * 1. SUPER ADMIN
   * ------------------------------------------------------------
   */

  const passwordHash = await bcrypt.hash("Admin@12345", 10);

  const superAdmin = await prisma.user.upsert({
    where: {
      email: "superadmin@corevault.in",
    },
    update: {
      name: "CoreVault Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash,
    },
    create: {
      name: "CoreVault Super Admin",
      email: "superadmin@corevault.in",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      phone: "9999999999",
    },
  });

  console.log("✓ Super Admin");

  /*
   * ------------------------------------------------------------
   * 2. CATEGORIES
   * ------------------------------------------------------------
   */

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        isActive: true,
      },
    });

    categoryMap.set(category.name, record.id);
  }

  console.log(`✓ ${categories.length} categories`);

  /*
   * ------------------------------------------------------------
   * 3. BRANDS
   * ------------------------------------------------------------
   */

  const brandMap = new Map<string, string>();

  for (const brandName of brands) {
    const slug = brandName.toLowerCase().replace(/\s+/g, "-");

    const brand = await prisma.brand.upsert({
      where: {
        slug,
      },
      update: {
        name: brandName,
        isActive: true,
      },
      create: {
        name: brandName,
        slug,
        isActive: true,
      },
    });

    brandMap.set(brandName, brand.id);
  }

  /*
   * Add brands used by products but not listed above.
   */

  for (const extraBrand of ["Samsung", "Western Digital", "Crucial"]) {
    const slug = extraBrand.toLowerCase().replace(/\s+/g, "-");

    const brand = await prisma.brand.upsert({
      where: { slug },
      update: {
        name: extraBrand,
        isActive: true,
      },
      create: {
        name: extraBrand,
        slug,
        isActive: true,
      },
    });

    brandMap.set(extraBrand, brand.id);
  }

  console.log("✓ Brands");

  /*
   * ------------------------------------------------------------
   * 4. CUSTOMERS
   * ------------------------------------------------------------
   */

  const customers = [];

  for (let i = 0; i < customerNames.length; i++) {
    const email = `customer${String(i + 1).padStart(2, "0")}@corevault.test`;

    const customer = await prisma.user.upsert({
      where: { email },
      update: {
        name: customerNames[i],
        role: "CUSTOMER",
        isActive: true,
      },
      create: {
        name: customerNames[i],
        email,
        passwordHash,
        phone: `98${String(10000000 + i).slice(-8)}`,
        role: "CUSTOMER",
        isActive: true,
        createdAt: daysAgo(90 - Math.min(i * 2, 60)),
      },
    });

    customers.push(customer);

    await prisma.address.upsert({
      where: {
        id: uuidFromNumber("a0000000", i + 1),
      },
      update: {
        fullName: customer.name,
        phone: customer.phone ?? "9999999999",
      },
      create: {
        id: uuidFromNumber("a0000000", i + 1),
        userId: customer.id,
        fullName: customer.name,
        phone: customer.phone ?? "9999999999",
        address: `${10 + i} CoreVault Avenue`,
        city: cities[i % cities.length][0],
        state: cities[i % cities.length][1],
        pinCode: cities[i % cities.length][2],
        country: "India",
        isDefault: true,
      },
    });
  }

  console.log(`✓ ${customers.length} customers`);

  /*
   * ------------------------------------------------------------
   * 5. PRODUCTS
   * ------------------------------------------------------------
   */

  const products = [];

  for (let i = 0; i < productDefinitions.length; i++) {
    const [name, slug, categoryName, brandName, price, stock] =
      productDefinitions[i];

    const categoryId = categoryMap.get(categoryName);
    const brandId = brandMap.get(brandName);

    if (!categoryId || !brandId) {
      throw new Error(
        `Missing category/brand for ${name}: ${categoryName}/${brandName}`,
      );
    }

    const product = await prisma.product.upsert({
      where: {
        slug,
      },
      update: {
        name,
        price,
        stock,
        brandId,
        categoryId,
        isActive: true,
        lowStockAt: 5,
      },
      create: {
        name,
        slug,
        sku: `CV-${String(i + 1).padStart(4, "0")}`,
        description: `${name} — CoreVault development catalog product.`,
        price,
        comparePrice: money(price * 1.08),
        brandId,
        categoryId,
        stock,
        lowStockAt: 5,
        rating: 4.2 + (i % 7) / 10,
        reviewCount: 0,
        images: [
          `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
        ],
        specifications: {
          warranty: "3 Years",
          source: "CoreVault Seed Data",
        },
        isActive: true,
        isOnDeal: i % 5 === 0,
        dealStart: i % 5 === 0 ? daysAgo(10) : null,
        dealEnd: i % 5 === 0 ? daysAgo(-20) : null,
        createdAt: daysAgo(80 - (i % 30)),
      },
    });

    products.push(product);
  }

  console.log(`✓ ${products.length} products`);

  /*
   * ------------------------------------------------------------
   * 6. ORDERS
   * ------------------------------------------------------------
   */

  const orderStatuses = [
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "SHIPPED",
    "SHIPPED",
    "PROCESSING",
    "PROCESSING",
    "PENDING",
    "CANCELLED",
  ] as const;

  const paymentStatuses = [
    "PAID",
    "PAID",
    "PAID",
    "PAID",
    "PAID",
    "PENDING",
    "FAILED",
    "REFUNDED",
  ] as const;

  const paymentMethods = ["UPI", "CARD", "COD"] as const;

  const deliveryMethods = ["STANDARD", "EXPRESS"] as const;

  const orders = [];

  await prisma.returnItem.deleteMany({
    where: {
      returnRequest: {
        adminNote: SEED_TAG,
      },
    },
  });

  await prisma.returnRequest.deleteMany({
    where: {
      adminNote: SEED_TAG,
    },
  });

  for (let i = 0; i < 60; i++) {
    const orderId = uuidFromNumber("b0000000-0000-0000-0000", i + 1);

    /*
     * Deliberately put several orders in the last 7 days
     * so the dashboard isn't empty when using the default
     * 7-day filter.
     */
    const age = i < 15 ? i % 7 : i < 30 ? 7 + (i % 15) : 22 + (i % 68);

    const status = orderStatuses[i % orderStatuses.length];

    let paymentStatus = paymentStatuses[i % paymentStatuses.length];

    if (status === "DELIVERED" || status === "SHIPPED") {
      paymentStatus = "PAID";
    }

    if (status === "CANCELLED") {
      paymentStatus = i % 2 === 0 ? "FAILED" : "REFUNDED";
    }

    const customer = customers[i % customers.length];

    const itemCount = 1 + (i % 3);

    const selectedProducts = [];

    for (let j = 0; j < itemCount; j++) {
      selectedProducts.push(products[(i * 3 + j * 5) % products.length]);
    }

    let subtotal = 0;

    const itemData = selectedProducts.map((product, itemIndex) => {
      const quantity = 1 + ((i + itemIndex) % 2);
      const itemSubtotal = money(Number(product.price) * quantity);

      subtotal += itemSubtotal;

      return {
        product,
        quantity,
        subtotal: itemSubtotal,
      };
    });

    const shippingCost = i % 4 === 0 ? 0 : i % 3 === 0 ? 149 : 99;
    const discount = i % 5 === 0 ? money(subtotal * 0.05) : 0;
    const tax = money((subtotal - discount) * 0.18);
    const total = money(subtotal + shippingCost + tax - discount);

    const createdAt = daysAgo(age, 9 + (i % 10));

    const order = await prisma.order.upsert({
      where: {
        orderNumber: `CV-2026-${String(i + 1).padStart(5, "0")}`,
      },
      update: {
        userId: customer.id,
        status,
        paymentMethod: paymentMethods[i % paymentMethods.length],
        paymentStatus,
        deliveryMethod: deliveryMethods[i % deliveryMethods.length],
        subtotal,
        shippingCost,
        discount,
        tax,
        total,
        shippingDetails: {
          fullName: customer.name,
          phone: customer.phone,
          address: `${10 + (i % 20)} CoreVault Avenue`,
          city: cities[i % cities.length][0],
          state: cities[i % cities.length][1],
          pinCode: cities[i % cities.length][2],
          country: "India",
        },
        createdAt,
      },
      create: {
        id: orderId,
        orderNumber: `CV-2026-${String(i + 1).padStart(5, "0")}`,
        userId: customer.id,
        status,
        paymentMethod: paymentMethods[i % paymentMethods.length],
        paymentStatus,
        deliveryMethod: deliveryMethods[i % deliveryMethods.length],
        subtotal,
        shippingCost,
        discount,
        tax,
        total,
        shippingDetails: {
          fullName: customer.name,
          phone: customer.phone,
          address: `${10 + (i % 20)} CoreVault Avenue`,
          city: cities[i % cities.length][0],
          state: cities[i % cities.length][1],
          pinCode: cities[i % cities.length][2],
          country: "India",
        },
        createdAt,
      },
    });

    for (let itemIndex = 0; itemIndex < itemData.length; itemIndex++) {
      const item = itemData[itemIndex];

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        },
      });
    }

    orders.push(order);
  }

  console.log(`✓ ${orders.length} orders`);

  /*
   * ------------------------------------------------------------
   * 7. REVIEWS
   * ------------------------------------------------------------
   */

  for (let i = 0; i < 30; i++) {
    const customer = customers[i % customers.length];
    const product = products[i % products.length];

    await prisma.review.upsert({
      where: {
        id: uuidFromNumber("d0000000-0000-0000-0000", i + 1),
      },
      update: {
        rating: 3 + (i % 3),
        isVerified: i % 3 !== 0,
        isApproved: i % 4 !== 0,
      },
      create: {
        id: uuidFromNumber("d0000000-0000-0000-0000", i + 1),
        userId: customer.id,
        productId: product.id,
        rating: 3 + (i % 3),
        title: i % 2 === 0 ? "Great product" : "Good purchase",
        comment: reviewComments[i % reviewComments.length],
        isVerified: i % 3 !== 0,
        isApproved: i % 4 !== 0,
        createdAt: daysAgo(i % 60),
      },
    });
  }

  /*
   * Update product review counters.
   */

  for (const product of products) {
    const aggregate = await prisma.review.aggregate({
      where: {
        productId: product.id,
      },
      _count: {
        _all: true,
      },
    });

    const ratingAggregate = await prisma.review.aggregate({
      where: {
        productId: product.id,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
    });

    await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        reviewCount: aggregate._count._all,
        rating: ratingAggregate._avg.rating ?? 0,
      },
    });
  }

  console.log("✓ 30 reviews");

  /*
   * ------------------------------------------------------------
   * 8. RETURN REQUESTS
   * ------------------------------------------------------------
   */

  const returnStatuses = [
    "REQUESTED",
    "REQUESTED",
    "APPROVED",
    "COMPLETED",
    "REJECTED",
  ] as const;

  const returnRefundStatuses = [
    "PENDING",
    "PENDING",
    "APPROVED",
    "COMPLETED",
    "REJECTED",
  ] as const;

  for (let i = 0; i < 5; i++) {
    const order = orders[10 + i];

    const existing = await prisma.returnRequest.findUnique({
      where: {
        id: uuidFromNumber("e0000000-0000-0000-0000", i + 1),
      },
    });

    if (existing) {
      await prisma.returnItem.deleteMany({
        where: {
          returnRequestId: existing.id,
        },
      });
    }

    const returnRequest = await prisma.returnRequest.upsert({
      where: {
        id: uuidFromNumber("e0000000-0000-0000-0000", i + 1),
      },
      update: {
        status: returnStatuses[i],
        refundStatus: returnRefundStatuses[i],
        refundAmount: orders[10 + i].total,
        adminNote: SEED_TAG,
      },
      create: {
        id: uuidFromNumber("e0000000-0000-0000-0000", i + 1),
        orderId: order.id,
        userId: order.userId,
        reason: i % 2 === 0 ? "Product not as expected" : "Changed my mind",
        status: returnStatuses[i],
        refundAmount: order.total,
        refundStatus: returnRefundStatuses[i],
        adminNote: SEED_TAG,
        createdAt: daysAgo(2 + i),
      },
    });

    const firstItem = await prisma.orderItem.findFirst({
      where: {
        orderId: order.id,
      },
    });

    if (firstItem) {
      await prisma.returnItem.create({
        data: {
          id: uuidFromNumber("f0000000-0000-0000-0000", i + 1),
          returnRequestId: returnRequest.id,
          orderItemId: firstItem.id,
          quantity: 1,
        },
      });
    }
  }

  console.log("✓ 5 return requests");

  /*
   * ------------------------------------------------------------
   * 9. ADMIN ACTIVITY
   * ------------------------------------------------------------
   */

  const activities = [
    ["ORDER_STATUS_UPDATED", "ORDER", "Order status changed to SHIPPED"],
    ["ORDER_STATUS_UPDATED", "ORDER", "Order moved to PROCESSING"],
    ["PRODUCT_UPDATED", "PRODUCT", "Product stock updated"],
    ["PRODUCT_CREATED", "PRODUCT", "New product added"],
    ["REVIEW_APPROVED", "REVIEW", "Customer review approved"],
    ["RETURN_REVIEWED", "RETURN", "Return request reviewed"],
    ["ORDER_STATUS_UPDATED", "ORDER", "Order marked as DELIVERED"],
    ["PRODUCT_UPDATED", "PRODUCT", "Low stock threshold updated"],
    ["REVIEW_APPROVED", "REVIEW", "Review approved by administrator"],
    ["ORDER_STATUS_UPDATED", "ORDER", "Order confirmed"],
  ] as const;

  for (let i = 0; i < activities.length; i++) {
    const [action, entityType, description] = activities[i];

    await prisma.adminActivity.upsert({
      where: {
        id: uuidFromNumber("90000000-0000-0000-0000", i + 1),
      },
      update: {
        action,
        entityType,
        metadata: {
          description,
          seed: SEED_TAG,
        },
      },
      create: {
        id: uuidFromNumber("90000000-0000-0000-0000", i + 1),
        userId: superAdmin.id,
        action,
        entityType,
        entityId:
          entityType === "ORDER"
            ? orders[i % orders.length].id
            : entityType === "PRODUCT"
              ? products[i % products.length].id
              : null,
        metadata: {
          description,
          seed: SEED_TAG,
        },
        createdAt: daysAgo(i % 7, 10 + (i % 8)),
      },
    });
  }

  console.log("✓ Admin activity");

  /*
   * ------------------------------------------------------------
   * DONE
   * ------------------------------------------------------------
   */

  const summary = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.review.count(),
    prisma.returnRequest.count(),
    prisma.adminActivity.count(),
  ]);

  console.log("\n========================================");
  console.log("🎉 CoreVault seed completed!");
  console.log("========================================");
  console.log(`Users:           ${summary[0]}`);
  console.log(`Products:        ${summary[1]}`);
  console.log(`Orders:          ${summary[2]}`);
  console.log(`Reviews:         ${summary[3]}`);
  console.log(`Returns:         ${summary[4]}`);
  console.log(`Admin Activity:  ${summary[5]}`);
  console.log("========================================");
  console.log("Admin login:");
  console.log("Email:    superadmin@corevault.in");
  console.log("Password: Admin@12345");
  console.log("========================================\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Seed failed:\n");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
