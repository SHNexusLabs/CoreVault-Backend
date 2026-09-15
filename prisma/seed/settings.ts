import type { Prisma } from "../../src/generated/prisma/client.js";
import { prisma } from "../../src/lib/prisma.js";

type SettingSeed = {
  key: string;
  value: Prisma.InputJsonValue;
  section:
    | "store"
    | "orders"
    | "inventory"
    | "shipping"
    | "payments"
    | "notifications"
    | "security";
  description?: string;
  isSecret?: boolean;
};

const settings: SettingSeed[] = [
  // ============================================================
  // STORE
  // ============================================================

  {
    key: "store.name",
    value: "Core Vault",
    section: "store",
    description: "Public store name",
  },
  {
    key: "store.legal_business_name",
    value: "Core Vault Technologies Pvt. Ltd.",
    section: "store",
    description: "Registered legal business name",
  },
  {
    key: "store.gst_number",
    value: "27AAACK1234N1ZA",
    section: "store",
    description: "GST registration number",
  },
  {
    key: "store.email",
    value: "support@corevault.in",
    section: "store",
    description: "Primary store support email",
  },
  {
    key: "store.phone",
    value: "+91 80000 00000",
    section: "store",
    description: "Primary store contact number",
  },
  {
    key: "store.currency",
    value: "INR",
    section: "store",
    description: "Store currency",
  },
  {
    key: "store.timezone",
    value: "Asia/Kolkata",
    section: "store",
    description: "Store timezone",
  },
  {
    key: "store.tax_mode",
    value: "inclusive",
    section: "store",
    description: "Whether product prices include tax",
  },
  {
    key: "store.address_line_1",
    value: "Unit 4A, Tech Park",
    section: "store",
    description: "Primary business address",
  },
  {
    key: "store.city",
    value: "Bengaluru",
    section: "store",
    description: "Business city",
  },
  {
    key: "store.state",
    value: "Karnataka",
    section: "store",
    description: "Business state",
  },
  {
    key: "store.pincode",
    value: "560001",
    section: "store",
    description: "Business pincode",
  },
  {
    key: "store.country",
    value: "India",
    section: "store",
    description: "Business country",
  },

  // ============================================================
  // ORDERS
  // ============================================================

  {
    key: "orders.auto_confirm",
    value: true,
    section: "orders",
    description: "Automatically confirm valid orders",
  },
  {
    key: "orders.allow_cancellation",
    value: true,
    section: "orders",
    description: "Allow customers to cancel eligible orders",
  },
  {
    key: "orders.cancellation_window_hours",
    value: 24,
    section: "orders",
    description: "Hours after ordering during which cancellation is allowed",
  },
  {
    key: "orders.require_payment_before_processing",
    value: true,
    section: "orders",
    description: "Require successful payment before processing an order",
  },

  // ============================================================
  // INVENTORY
  // ============================================================

  {
    key: "inventory.low_stock_default",
    value: 5,
    section: "inventory",
    description: "Default low-stock threshold for new products",
  },
  {
    key: "inventory.allow_backorders",
    value: false,
    section: "inventory",
    description: "Allow customers to order products with zero stock",
  },
  {
    key: "inventory.auto_disable_out_of_stock",
    value: false,
    section: "inventory",
    description: "Automatically disable products when stock reaches zero",
  },

  // ============================================================
  // SHIPPING
  // ============================================================

  {
    key: "shipping.standard.enabled",
    value: true,
    section: "shipping",
    description: "Enable Standard Delivery",
  },
  {
    key: "shipping.standard.days",
    value: "3-5 business days",
    section: "shipping",
    description: "Standard Delivery estimate",
  },
  {
    key: "shipping.standard.price",
    value: 99,
    section: "shipping",
    description: "Standard Delivery price",
  },

  {
    key: "shipping.express.enabled",
    value: true,
    section: "shipping",
    description: "Enable Express Delivery",
  },
  {
    key: "shipping.express.days",
    value: "1-2 business days",
    section: "shipping",
    description: "Express Delivery estimate",
  },
  {
    key: "shipping.express.price",
    value: 299,
    section: "shipping",
    description: "Express Delivery price",
  },

  {
    key: "shipping.same_day.enabled",
    value: true,
    section: "shipping",
    description: "Enable Same Day Delivery",
  },
  {
    key: "shipping.same_day.days",
    value: "Same day (order by 12 PM)",
    section: "shipping",
    description: "Same Day Delivery estimate",
  },
  {
    key: "shipping.same_day.price",
    value: 499,
    section: "shipping",
    description: "Same Day Delivery price",
  },

  {
    key: "shipping.free.enabled",
    value: true,
    section: "shipping",
    description: "Enable Free Shipping",
  },
  {
    key: "shipping.free.threshold",
    value: 999,
    section: "shipping",
    description: "Minimum order value for free shipping",
  },

  // ============================================================
  // PAYMENTS
  // ============================================================

  {
    key: "payments.auto_refund_on_cancellation",
    value: true,
    section: "payments",
    description: "Automatically initiate refund when an order is cancelled",
  },
  {
    key: "payments.refund_approval_required",
    value: true,
    section: "payments",
    description: "Require Super Admin approval for large refunds",
  },
  {
    key: "payments.refund_approval_threshold",
    value: 10000,
    section: "payments",
    description: "Refund amount above which approval is required",
  },

  // Payment credentials intentionally remain placeholders.
  {
    key: "payments.razorpay.key_id",
    value: "",
    section: "payments",
    description: "Razorpay public API key",
    isSecret: true,
  },
  {
    key: "payments.razorpay.key_secret",
    value: "",
    section: "payments",
    description: "Razorpay secret API key",
    isSecret: true,
  },

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  {
    key: "notifications.order_confirmation",
    value: true,
    section: "notifications",
    description: "Send notification when an order is confirmed",
  },
  {
    key: "notifications.order_shipped",
    value: true,
    section: "notifications",
    description: "Send notification when an order is shipped",
  },
  {
    key: "notifications.order_delivered",
    value: true,
    section: "notifications",
    description: "Send notification when an order is delivered",
  },
  {
    key: "notifications.low_stock",
    value: true,
    section: "notifications",
    description: "Notify administrators about low stock",
  },
  {
    key: "notifications.new_customer",
    value: true,
    section: "notifications",
    description: "Notify administrators when a new customer registers",
  },

  // ============================================================
  // SECURITY
  // ============================================================

  {
    key: "security.minimum_password_length",
    value: 12,
    section: "security",
    description: "Minimum password length",
  },
  {
    key: "security.require_uppercase",
    value: true,
    section: "security",
    description: "Require uppercase letters in passwords",
  },
  {
    key: "security.require_numbers",
    value: true,
    section: "security",
    description: "Require numbers in passwords",
  },
  {
    key: "security.require_special_characters",
    value: true,
    section: "security",
    description: "Require special characters in passwords",
  },
  {
    key: "security.password_expiry_days",
    value: 90,
    section: "security",
    description: "Password expiry period in days",
  },
  {
    key: "security.session_timeout_minutes",
    value: 30,
    section: "security",
    description: "Automatic logout after inactivity",
  },
  {
    key: "security.max_login_attempts",
    value: 5,
    section: "security",
    description: "Maximum failed login attempts",
  },
  {
    key: "security.require_2fa",
    value: false,
    section: "security",
    description: "Require two-factor authentication for Super Admin",
  },
];

export async function seedSettings() {
  console.log("⚙️ Seeding system settings...");

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },
      update: {
        value: setting.value,
        section: setting.section,
        description: setting.description,
        isSecret: setting.isSecret ?? false,
      },
      create: {
        key: setting.key,
        value: setting.value,
        section: setting.section,
        description: setting.description,
        isSecret: setting.isSecret ?? false,
      },
    });
  }

  console.log(`✅ Seeded ${settings.length} system settings`);
}
