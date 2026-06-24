import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { pptToPdf } from "../controllers/pptToPdfController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  console.log("MIME:", file.mimetype);
  console.log("NAME:", file.originalname);

  if (ext === ".pptx") {
    cb(null, true);
  } else {
    cb(new Error("Only PPTX files are accepted"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

router.post(
  "/ppt-to-pdf",
  upload.single("ppt"),
  pptToPdf
);

export default router;