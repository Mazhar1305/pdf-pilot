import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { pdfToPpt } from "../controllers/pdfToPptController.js";

const router = express.Router();

router.post(
  "/pdf-to-ppt",
  upload.single("pdf"),
  pdfToPpt
);

export default router;