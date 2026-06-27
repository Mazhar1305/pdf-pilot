import express from "express";

import { pdfToJpg } from "../controllers/pdfToJpgController.js";
import upload from "../middleware/pdfUploadMiddleware.js";

const router = express.Router();

router.post(
  "/pdf-to-jpg",
  upload.single("file"),
  pdfToJpg
);

export default router;