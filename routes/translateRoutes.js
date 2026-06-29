import express from "express";
import upload from "../middleware/documentUploadMiddleware.js";
import { translateDocument } from "../controllers/translateController.js";

const router = express.Router();

router.post("/translate", (req, res, next) => {
  upload.single("document")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, translateDocument);

export default router;
