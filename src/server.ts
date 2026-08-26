import "dotenv/config";
import express from "express";
import cors from "cors";

/* Routes imports */
import authRoutes from "./routes/auth.routes.js";

import productRoutes from "./routes/product.routes.js";
import adminProductRoutes from "./routes/admin-product.routes.js";

import brandRoutes from "./routes/brand.routes.js";
import adminBrandRoutes from "./routes/admin-brand.routes.js";

import categoryRoutes from "./routes/category.routes.js";
import adminCategoryRoutes from "./routes/admin-category.routes.js";

import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";

import orderRoutes from "./routes/order.routes.js";
import adminOrderRoutes from "./routes/admin-order.routes.js";

import cartRoutes from "./routes/cart.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import addressRoutes from "./routes/address.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

import reviewRoutes from "./routes/review.routes.js";
import adminReviewRoutes from "./routes/admin-review.routes.js";

import adminDashboardRoutes from "./routes/admin-dashboard.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

/* Routes */
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "TechStore API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/admin/products", adminProductRoutes);

app.use("/api/brands", brandRoutes);
app.use("/api/admin/brands", adminBrandRoutes);

app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 TechStore API running on port ${PORT}`);
});
