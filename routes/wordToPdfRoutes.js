import express from "express";
import { uploadDocx } from "../middleware/docxUploadMiddleware.js";
import { convertWordToPdf } from "../controllers/wordToPdfController.js";

const router = express.Router();

router.post("/convert/word-to-pdf", uploadDocx, convertWordToPdf);

export default router;
