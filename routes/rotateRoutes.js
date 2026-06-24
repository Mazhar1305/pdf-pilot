import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { rotatePdf } from "../controllers/rotateController.js";

const router = express.Router();

router.post("/rotate", upload.single("pdf"), rotatePdf);

export default router;
