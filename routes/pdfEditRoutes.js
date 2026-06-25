import express from "express";

import upload from "../middleware/pdfEditUploadMiddleware.js";
import { editPdf } from "../controllers/pdfEditController.js";

const router = express.Router();

router.post(
  "/edit",
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ]),
  editPdf
);

export default router;