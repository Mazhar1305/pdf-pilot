import express from "express";
import { uploadExcel } from "../middleware/excelUploadMiddleware.js";
import { convertExcelToPdf } from "../controllers/excelToPdfController.js";

const router = express.Router();

router.post("/convert/excel-to-pdf", uploadExcel, convertExcelToPdf);

export default router;
