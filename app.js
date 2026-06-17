import express from "express";
import dotenv from "dotenv";
import pdfRoutes from "./routes/pdfRoutes.js";
dotenv.config()

import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

connectDB();

app.use("/uploads", express.static("uploads"));

app.use("/", healthRoutes);
app.use("/api/pdf", pdfRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});