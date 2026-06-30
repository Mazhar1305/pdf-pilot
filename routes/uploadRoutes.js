import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadFile } from "../controllers/uploadController.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".pdf", ".docx", ".xlsx", ".pptx", ".jpg", ".jpeg", ".png", ".txt"];
  
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Allowed formats: PDF, DOCX, XLSX, PPTX, JPG, JPEG, PNG, TXT."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB size limit
  }
});

const router = express.Router();

router.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds the limit. Maximum allowed size is 20MB." });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadFile);

export default router;
