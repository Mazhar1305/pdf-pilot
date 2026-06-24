import express from "express";
import upload from "../middleware/uploadMiddleware.js";

import {
    compressPdf
} from "../controllers/pdfCompressController.js";

const router = express.Router();

router.post(
    "/compress",
    upload.single("file"),
    compressPdf
);

export default router;