import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { removePages } from "../controllers/removePagesController.js";

const router = express.Router();

router.post("/remove-pages", uploadPdf, removePages);

export default router;
