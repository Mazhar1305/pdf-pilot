import express from "express";

import {
  generateDocument
} from "../controllers/aiGenerateController.js";

const router = express.Router();

router.post(
  "/generate",
  generateDocument
);

export default router;