import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { performOcr } from "../controllers/ocrController.js";

const router = express.Router();

router.post("/ocr", uploadPdf, performOcr);

export default router;
