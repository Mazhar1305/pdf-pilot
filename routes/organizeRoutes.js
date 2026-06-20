import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { organizePdf } from "../controllers/organizeController.js";

const router = express.Router();

router.post("/organize", uploadPdf, organizePdf);

export default router;
