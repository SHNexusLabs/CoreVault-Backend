import { prisma } from "../../src/lib/prisma.js";

const permissions = [
  // Operations
  {
    id: "dashboard",
    name: "Dashboard",
    description: "View the main dashboard",
    section: "Operations",
  },
  {
    id: "orders.view",
    name: "Orders – View",
    description: "View all orders",
    section: "Operations",
  },
  {
    id: "orders.manage",
    name: "Orders – Manage",
    description: "Update order status, add notes",
    section: "Operations",
  },
  {
    id: "fulfillment",
    name: "Fulfillment",
    description: "Processing, packing, shipping queues",
    section: "Operations",
  },
  {
    id: "packing",
    name: "Packing",
    description: "Access packing queue and packing details",
    section: "Operations",
  },
  {
    id: "shipping",
    name: "Shipping",
    description: "Shipping queue, courier assignment",
    section: "Operations",
  },
  {
    id: "returns",
    name: "Returns",
    description: "View and manage return requests",
    section: "Operations",
  },

  // Catalog
  {
    id: "products.view",
    name: "Products – View",
    description: "View products",
    section: "Catalog",
  },
  {
    id: "products.manage",
    name: "Products – Manage",
    description: "Create, edit and delete products",
    section: "Catalog",
  },
  {
    id: "categories",
    name: "Categories",
    description: "Manage product categories",
    section: "Catalog",
  },
  {
    id: "inventory.view",
    name: "Inventory – View",
    description: "View inventory levels",
    section: "Catalog",
  },
  {
    id: "inventory.adjust",
    name: "Inventory – Adjust",
    description: "Adjust product stock",
    section: "Catalog",
  },

  // Customers & Finance
  {
    id: "customers",
    name: "Customers",
    description: "View and manage customers",
    section: "Customers & Finance",
  },
  {
    id: "payments.view",
    name: "Payments – View",
    description: "View payment transactions",
    section: "Customers & Finance",
  },
  {
    id: "payments.refund",
    name: "Payments – Refund",
    description: "Process payment refunds",
    section: "Customers & Finance",
  },
  {
    id: "invoices",
    name: "Invoices",
    description: "View and manage invoices",
    section: "Customers & Finance",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "View analytics and reports",
    section: "Customers & Finance",
  },
  {
    id: "export",
    name: "Export",
    description: "Export business data",
    section: "Customers & Finance",
  },

  // Administration
  {
    id: "staff",
    name: "Staff",
    description: "Manage staff accounts",
    section: "Administration",
    isSuperAdminOnly: true,
  },
  {
    id: "roles",
    name: "Roles & Permissions",
    description: "Manage roles and permissions",
    section: "Administration",
    isSuperAdminOnly: true,
  },
  {
    id: "audit",
    name: "Activity Log",
    description: "View administrative activity",
    section: "Administration",
    isSuperAdminOnly: true,
  },
  {
    id: "critical_overrides",
    name: "Critical Overrides",
    description: "Perform critical administrative overrides",
    section: "Administration",
    isSuperAdminOnly: true,
  },

  // System Settings
  {
    id: "settings.store",
    name: "Store Settings",
    description: "Manage store settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
  {
    id: "settings.orders",
    name: "Order Settings",
    description: "Manage order settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
  {
    id: "settings.inventory",
    name: "Inventory Settings",
    description: "Manage inventory settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
  {
    id: "settings.shipping",
    name: "Shipping Settings",
    description: "Manage shipping settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
  {
    id: "settings.payments",
    name: "Payment Settings",
    description: "Manage payment settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
  {
    id: "settings.security",
    name: "Security Settings",
    description: "Manage security settings",
    section: "System Settings",
    isSuperAdminOnly: true,
  },
];

const adminPermissionIds = [
  "dashboard",
  "orders.view",
  "orders.manage",
  "fulfillment",
  "packing",
  "shipping",
  "returns",
  "products.view",
  "products.manage",
  "categories",
  "inventory.view",
  "inventory.adjust",
  "customers",
  "payments.view",
  "invoices",
  "analytics",
  "export",
] as const;

async function main() {
  console.log("🌱 Seeding permissions...");

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: adminPermissionIds.map((permissionId) => ({
      role: "ADMIN" as const,
      permissionId,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${permissions.length} permissions`);
  console.log(`✅ Assigned ${adminPermissionIds.length} permissions to ADMIN`);
  console.log("✅ SUPER_ADMIN automatically has all permissions");
}

main()
  .catch((error) => {
    console.error("❌ Permission seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });