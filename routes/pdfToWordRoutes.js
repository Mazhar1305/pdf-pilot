import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { pdfToWord } from "../controllers/pdfToWordController.js";

const router = express.Router();

router.post(
  "/pdf-to-word",
  upload.single("pdf"),
  pdfToWord
);

export default router;