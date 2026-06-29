import express from "express";

import upload from "../middleware/pdfUploadMiddleware.js";
import { addPageNumbers } from "../controllers/pdfPageNumbersController.js";

const router = express.Router();

router.post(
  "/page-numbers",
  upload.single("pdf"),
  addPageNumbers
);

export default router;