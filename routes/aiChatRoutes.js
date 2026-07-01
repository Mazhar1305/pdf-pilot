import express from "express";

import upload from "../middleware/documentUploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

import {
  documentChat
} from "../controllers/aiChatController.js";

const router = express.Router();

router.post(
  "/chat",
  protect,
  upload.single("document"),
  documentChat
);

export default router;