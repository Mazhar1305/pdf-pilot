import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { pdfToExcel } from "../controllers/pdfToExcelController.js";

const router = express.Router();

router.post(
  "/pdf-to-excel",
  upload.single("pdf"),
  pdfToExcel
);

export default router;