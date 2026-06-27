import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { unlockPdf } from "../controllers/unlockController.js";

const router = express.Router();

router.post("/unlock", upload.single("pdf"), unlockPdf);

export default router;
