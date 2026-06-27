import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { redactPdf } from "../controllers/pdfRedactController.js";

const router = express.Router();

router.post(
  "/redact",
  upload.single("pdf"),
  redactPdf
);

export default router;