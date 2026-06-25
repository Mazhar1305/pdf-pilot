import express from "express";

import upload from "../middleware/watermarkUploadMiddleware.js";
import { addWatermark } from "../controllers/pdfWatermarkController.js";

const router = express.Router();

router.post(
  "/watermark",
  upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "watermarkImage", maxCount: 1 }
]),
  addWatermark
);

export default router;