import express from "express";
import upload from "../middleware/documentUploadMiddleware.js";
import { explainDocument } from "../controllers/explainController.js";

const router = express.Router();

router.post("/explain", (req, res, next) => {
  upload.single("document")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, explainDocument);

export default router;
