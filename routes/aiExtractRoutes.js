import express from "express";

import upload from "../middleware/documentImageUploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

import {
  extractDocumentData
} from "../controllers/aiExtractController.js";

const router = express.Router();

router.post(
  "/extract",
  protect,
  upload.single("document"),
  extractDocumentData
);

export default router;