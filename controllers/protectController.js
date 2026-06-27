import fs from "fs";
import path from "path";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import Job from "../models/Job.js";

export const protectPdf = async (req, res) => {
  let job = null;
  const inputPath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // 1. Validate PDF signature
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString("ascii") !== "%PDF-") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
    }

    const { password } = req.body;

    if (!password || typeof password !== "string" || password.trim() === "") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "password parameter is required and must be a non-empty string" });
    }

    // 2. Create Job & File records
    job = await Job.create({
      tool: "protect",
      status: "processing"
    });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // 3. Encrypt the PDF bytes
    const pdfBytes = fs.readFileSync(inputPath);
    const encryptedBytes = await encryptPDF(new Uint8Array(pdfBytes), password);

    const outFileName = `protect-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outPath = path.resolve("uploads", "output", outFileName);

    // Ensure directory exists and write file
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, encryptedBytes);

    const downloadUrl = `/uploads/output/${outFileName}`;

    // 4. Update Job status
    job.status = "done";
    job.outputFile = outFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl
    });

  } catch (error) {
    console.error("protectPdf error:", error);

    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not unlink source PDF file on error:", unlinkErr);
      }
    }

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during PDF encryption"
    });
  }
};
