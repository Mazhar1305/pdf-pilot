import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { repairPDF } from "../controllers/pdfRepairController.js";

const router = express.Router();

router.post(
    "/repair",
    upload.single("file"),
    repairPDF
);

export default router;