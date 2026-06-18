import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { splitPdf } from "../controllers/pdfController.js";

const router = express.Router();

router.post("/split", uploadPdf, splitPdf);

export default router;
