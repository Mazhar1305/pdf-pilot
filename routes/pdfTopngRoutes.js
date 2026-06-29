import express from "express";

import { pdfTopng } from "../controllers/pdfTopngController.js";
import upload from "../middleware/pdfUploadMiddleware.js";

const router = express.Router();

router.post(
  "/pdf-to-png",
  upload.single("file"),
  pdfTopng
);

export default router;