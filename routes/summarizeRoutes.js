import express from "express";
import upload from "../middleware/documentUploadMiddleware.js";
import { summarizeDocument } from "../controllers/summarizeController.js";

const router = express.Router();

router.post("/summarize", (req, res, next) => {
  upload.single("document")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, summarizeDocument);

export default router;
