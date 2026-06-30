import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";

export const uploadFile = async (req, res) => {
  const inputPath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 1. Generate unique fileId
    const fileId = uuidv4();

    // 2. Save metadata in File model
    const fileRecord = await File.create({
      fileId,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // 3. Return success response
    return res.status(200).json({
      fileId,
      status: "success",
      file: {
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        createdAt: fileRecord.createdAt
      }
    });

  } catch (error) {
    console.error("uploadFile error:", error);

    // Cleanup uploaded file on error
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not delete uploaded file:", unlinkErr);
      }
    }

    return res.status(500).json({
      error: error.message || "Internal server error during file upload"
    });
  }
};
