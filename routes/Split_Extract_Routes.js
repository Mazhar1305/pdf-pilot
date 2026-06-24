import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  splitPdf,
  extractPages
} from "../controllers/Split_Extract_Controller.js";

const router = express.Router();

router.post("/split", upload.single("pdf"), splitPdf);

router.post(
  "/extract-pages",
  upload.single("pdf"),
  extractPages
);

export default router;