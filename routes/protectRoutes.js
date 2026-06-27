import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { protectPdf } from "../controllers/protectController.js";

const router = express.Router();

router.post("/protect", upload.single("pdf"), protectPdf);

export default router;
