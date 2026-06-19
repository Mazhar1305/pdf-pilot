import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import {
  splitPdf,
  extractPages
} from "../controllers/Split_Extract_Controller.js";

const router = express.Router();

router.post("/split", uploadPdf, splitPdf);

router.post(
  "/extract-pages",
  uploadPdf,
  extractPages
);

export default router;