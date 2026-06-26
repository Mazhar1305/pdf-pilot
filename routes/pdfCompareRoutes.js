import express from "express";

import upload from "../middleware/pdfCompareUploadMiddleware.js";
import { comparePdf } from "../controllers/pdfCompareController.js";

const router = express.Router();

router.post(
  "/compare",
  upload.fields([
    { name: "pdf1", maxCount: 1 },
    { name: "pdf2", maxCount: 1 }
  ]),
  comparePdf
);

export default router;