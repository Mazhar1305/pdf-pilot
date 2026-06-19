import express from "express";
import { uploadPdf } from "../middleware/uploadMiddleware.js";
import { extractPages } from "../controllers/extractController.js";

const router = express.Router();

router.post(
  "/extract-pages",
  uploadPdf,
  extractPages
);

export default router;
