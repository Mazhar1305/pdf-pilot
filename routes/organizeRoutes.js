import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { organizePdf } from "../controllers/organizeController.js";

const router = express.Router();

router.post("/organize", upload.single("pdf"), organizePdf);

export default router;
