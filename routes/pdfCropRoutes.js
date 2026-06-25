import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { cropPdf } from "../controllers/pdfCropController.js";

const router = express.Router();

router.post(
  "/crop",
  upload.single("pdf"),
  cropPdf
);

export default router;