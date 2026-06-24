import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { performOcr } from "../controllers/ocrController.js";

const router = express.Router();

router.post("/ocr", upload.single("pdf"), performOcr);

export default router;
