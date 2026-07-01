import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import WordToPdf from "../models/WordToPdfModel.js";
import { htmlToPdfBuffer } from "../services/htmlToPdfService.js";

// Cross-platform DOCX -> PDF:
//   mammoth converts the .docx to HTML, then headless Chromium renders it to PDF.
// This replaces the previous Microsoft Word COM automation, which was
// Windows-only and unsupported for unattended/server use.
export const convertWordToPdf = async (req, res) => {
  let job = null;
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Word file uploaded" });
    }

    inputPath = path.resolve(req.file.path);

    // Validate DOCX header (ZIP magic signature: 50 4B 03 04)
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (buffer.toString("hex") !== "504b0304") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid DOCX file" });
    }

    job = await WordToPdf.create({
      status: "pending",
      inputFile: req.file.originalname
    });
    job.status = "processing";
    await job.save();

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    const outputFileName = `conv-${Date.now()}-${uuidv4()}.pdf`;
    const outputPath = path.resolve("uploads", "output", outputFileName);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // 1. DOCX -> HTML
    const { value: bodyHtml } = await mammoth.convertToHtml({ path: inputPath });

    // 2. Wrap in a printable document
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; color: #111; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #999; padding: 4px 8px; }
      img { max-width: 100%; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

    // 3. HTML -> PDF
    const pdfBuffer = await htmlToPdfBuffer(html);
    fs.writeFileSync(outputPath, pdfBuffer);

    // Clean up the uploaded source file
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    job.status = "done";
    job.outputFile = outputFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {
    console.error("convertWordToPdf error:", error);

    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not unlink source DOCX file on error:", unlinkErr);
      }
    }

    if (job) {
      job.status = "failed";
      job.error = error.message || "Unknown conversion error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during document conversion"
    });
  }
};
