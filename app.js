import express from "express";
import dotenv from "dotenv";
dotenv.config()

import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

connectDB();

app.use("/", healthRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});