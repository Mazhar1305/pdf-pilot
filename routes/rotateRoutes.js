import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { rotatePdf } from "../controllers/rotateController.js";

const router = express.Router();

router.post("/rotate", uploadPdf, rotatePdf);

export default router;
