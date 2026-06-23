import express from "express";
import { convertHtmlToPdf } from "../controllers/htmlToPdfController.js";

const router = express.Router();

router.post("/convert/html-to-pdf", convertHtmlToPdf);

export default router;
