import express from "express";

import upload from "../middleware/documentImageUploadMiddleware.js";

import {
  extractDocumentData
} from "../controllers/aiExtractController.js";

const router = express.Router();

router.post(
  "/extract",
  upload.single("document"),
  extractDocumentData
);

export default router;