import express from "express";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import Split_Extract_Routes from "./routes/Split_Extract_Routes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import pdfRoutes from "./routes/pdfRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

console.log(process.env.MONGODB_URI);
connectDB();

app.use("/uploads", express.static("uploads"));

app.use("/", healthRoutes);
app.use("/api/pdf", pdfRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
