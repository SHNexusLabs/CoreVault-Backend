import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "TechStore API is running",
  });
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 TechStore API running on port ${PORT}`);
});
