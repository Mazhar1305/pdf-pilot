import express from "express";

import { pngToPdf } from "../controllers/pngToPdfController.js";
import { uploadPngImages } from "../middleware/pngUploadMiddleware.js";

const router = express.Router();

router.post(
  "/png-to-pdf",
  uploadPngImages,
  pngToPdf
);

export default router;