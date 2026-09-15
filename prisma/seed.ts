import { prisma } from "../src/lib/prisma.js";
import { seedPermissions } from "./seed/permissions.js";
import { seedSettings } from "./seed/settings.js";

async function main() {
  console.log("🌱 Starting database seed...");

  await seedPermissions();
  await seedSettings();

  console.log("✅ Database seed completed successfully");
}

main()
  .catch((error) => {
    console.error("❌ Database seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
