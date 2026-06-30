import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import File from "../models/File.js";

export const downloadFile = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id || id.trim() === "") {
      return res.status(400).json({ error: "File ID parameter is required" });
    }

    // 1. Resolve file record by fileId or _id
    let fileRecord = await File.findOne({ fileId: id });

    if (!fileRecord && mongoose.Types.ObjectId.isValid(id)) {
      fileRecord = await File.findById(id);
    }

    // 2. Validate existence
    if (!fileRecord) {
      return res.status(404).json({ error: "File record not found in database" });
    }

    const physicalPath = path.resolve(fileRecord.path);

    if (!fs.existsSync(physicalPath)) {
      return res.status(404).json({ error: "Physical file not found on server filesystem" });
    }

    // 3. Log download action if required
    console.log(`Downloading file: ${fileRecord.originalName} (${fileRecord.fileId || fileRecord._id})`);

    // 4. Send as downloadable attachment
    return res.download(physicalPath, fileRecord.originalName, (err) => {
      if (err) {
        console.error("Error during file download stream:", err);
        if (!res.headersSent) {
          return res.status(500).json({ error: "Error occurred while streaming file content" });
        }
      }
    });

  } catch (error) {
    console.error("downloadFile error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during file download"
    });
  }
};
