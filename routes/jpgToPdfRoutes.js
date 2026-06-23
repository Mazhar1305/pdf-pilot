import express from "express";

import { jpgToPdf } from "../controllers/jpgToPdfController.js";
import { uploadImages } from "../middleware/imageUploadMiddleware.js";

const router = express.Router();

router.post(
  "/jpg-to-pdf",
  uploadImages,
  jpgToPdf
);

export default router;