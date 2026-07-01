import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import Plan from "./models/Plan.js";

await connectDB();

const plans = [
  {
    name: "Free",
    price: 0,
    dailyLimit: 10,
    monthlyLimit: 100,
    supportedFeatures: [
      "PDF to JPG",
      "PDF Merge",
      "PDF Split"
    ],
    maxUploadSize: "10MB",
  },
  {
    name: "Pro",
    price: 9.99,
    dailyLimit: 200,
    monthlyLimit: 5000,
    supportedFeatures: [
      "Unlimited PDF Conversion",
      "OCR",
      "Compress",
      "Priority Support"
    ],
    maxUploadSize: "100MB",
  },
  {
    name: "Team",
    price: 29.99,
    dailyLimit: 1000,
    monthlyLimit: 50000,
    supportedFeatures: [
      "All Pro Features",
      "Team Management",
      "API Access",
      "Priority Queue"
    ],
    maxUploadSize: "500MB",
  },
];

try {
  await Plan.deleteMany();
  await Plan.insertMany(plans);

  console.log("Plans seeded successfully!");
} catch (err) {
  console.error(err);
} finally {
  process.exit();
}