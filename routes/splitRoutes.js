import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { splitPdf } from "../controllers/splitController.js";

const router = express.Router();

router.post("/split", uploadPdf, splitPdf);

export default router;
