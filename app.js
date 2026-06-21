import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();

import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import splitExtractRoutes from "./routes/Split_Extract_Routes.js";
import pdfRoutes from "./routes/pdfRoutes.js";
import rotateRoutes from "./routes/rotateRoutes.js";
import organizeRoutes from "./routes/organizeRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

connectDB();

app.use("/", healthRoutes);
app.use("/api/pdf", splitExtractRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/pdf", rotateRoutes);
app.use("/api/pdf", organizeRoutes);
app.use("/api/pdf", ocrRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
