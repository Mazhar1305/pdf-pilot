import express from "express";

const router = express.Router();

import { mergePDFs } from "../controllers/pdfController.js";
import upload from "../middleware/uploadMiddleware.js";

router.post(
  "/merge",
  upload.array("files", 20),
  mergePDFs
);

export default router;