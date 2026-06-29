import express from "express";

import upload from "../middleware/documentUploadMiddleware.js";

import {
  documentChat
} from "../controllers/aiChatController.js";

const router = express.Router();

router.post(
  "/chat",
  upload.single("document"),
  documentChat
);

export default router;