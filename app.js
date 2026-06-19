import express from "express";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import extractRoutes from "./routes/extractRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

connectDB();

app.use("/", healthRoutes);
app.use("/api/pdf", extractRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});