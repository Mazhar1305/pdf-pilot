import express from "express";
import upload from "../middleware/pdfUploadMiddleware.js";
import { pdfToJpg } from "../controllers/pdfToJpgController.js";

const router = express.Router();

router.post(
    "/pdf-to-jpg",
    upload.single("file"),
    pdfToJpg
);

export default router;