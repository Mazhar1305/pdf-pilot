import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import Job from "../models/Job.js";

// Helper to cleanup uploaded files on error
const cleanupFiles = (files) => {
  if (!files) return;
  try {
    if (files['pdf'] && files['pdf'][0] && fs.existsSync(files['pdf'][0].path)) {
      fs.unlinkSync(files['pdf'][0].path);
    }
    if (files['signatureImage'] && files['signatureImage'][0] && fs.existsSync(files['signatureImage'][0].path)) {
      fs.unlinkSync(files['signatureImage'][0].path);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};

export const signPdf = async (req, res) => {
  let job = null;
  const pdfFile = req.files && req.files["pdf"] ? req.files["pdf"][0] : null;
  const signatureImageFile = req.files && req.files["signatureImage"] ? req.files["signatureImage"][0] : null;

  try {
    if (!pdfFile) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // 1. Validate PDF signature
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(pdfFile.path, "r");
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString("ascii") !== "%PDF-") {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
    }

    const { type, signatureData, text } = req.body;

    if (!type || !["drawn", "typed", "image"].includes(type)) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "type is required and must be 'drawn', 'typed', or 'image'" });
    }

    // Parse coordinates and constraints
    const page = parseInt(req.body.page || "1", 10);
    const x = parseFloat(req.body.x || "100");
    const y = parseFloat(req.body.y || "100");
    const width = parseFloat(req.body.width || "150");
    const height = parseFloat(req.body.height || "50");

    if (isNaN(page) || page < 1) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "page must be a positive integer" });
    }

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "Invalid coordinates, width, or height provided" });
    }

    // Load PDF Document
    const pdfBytes = fs.readFileSync(pdfFile.path);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    if (page > totalPages) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: `Page ${page} is out of bounds (PDF has ${totalPages} pages)` });
    }

    const targetPage = srcPdf.getPage(page - 1);

    // 2. Process based on signature type
    if (type === "image") {
      if (!signatureImageFile) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "signatureImage file parameter is required for type=image" });
      }

      const imgBytes = fs.readFileSync(signatureImageFile.path);
      const ext = path.extname(signatureImageFile.originalname).toLowerCase();
      let image;

      if (ext === ".png" || signatureImageFile.mimetype === "image/png") {
        image = await srcPdf.embedPng(imgBytes);
      } else if (ext === ".jpg" || ext === ".jpeg" || signatureImageFile.mimetype === "image/jpeg") {
        image = await srcPdf.embedJpg(imgBytes);
      } else {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Only PNG and JPG/JPEG images are supported for signature" });
      }

      targetPage.drawImage(image, { x, y, width, height });

    } else if (type === "drawn") {
      if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/png;base64,")) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "signatureData is required and must be a valid base64 PNG data URL for type=drawn" });
      }

      const base64Data = signatureData.replace(/^data:image\/png;base64,/, "");
      let imgBytes;
      try {
        imgBytes = Buffer.from(base64Data, "base64");
      } catch {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Invalid base64 encoding in signatureData" });
      }

      const image = await srcPdf.embedPng(imgBytes);
      targetPage.drawImage(image, { x, y, width, height });

    } else if (type === "typed") {
      if (!text || typeof text !== "string" || text.trim() === "") {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "text is required and must be a non-empty string for type=typed" });
      }

      // StandardFonts.CourierOblique looks like a cursive/italic signature
      const font = await srcPdf.embedFont(StandardFonts.CourierOblique);
      targetPage.drawText(text, {
        x,
        y,
        size: 20,
        font
      });
    }

    // 3. Create Job & File records
    job = await Job.create({
      tool: "sign",
      status: "processing"
    });

    await File.create({
      originalName: pdfFile.originalname,
      fileName: pdfFile.filename,
      path: pdfFile.path,
      mimeType: pdfFile.mimetype,
      size: pdfFile.size
    });

    const outFileName = `sign-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outPath = path.resolve("uploads", "output", outFileName);

    // Save PDF
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const outBytes = await srcPdf.save();
    fs.writeFileSync(outPath, outBytes);

    const downloadUrl = `/uploads/output/${outFileName}`;

    // 4. Update Job status
    job.status = "done";
    job.outputFile = outFileName;
    await job.save();

    // Clean up temporary signature image upload if present
    if (signatureImageFile && fs.existsSync(signatureImageFile.path)) {
      fs.unlinkSync(signatureImageFile.path);
    }

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl
    });

  } catch (error) {
    console.error("signPdf error:", error);
    cleanupFiles(req.files);

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during PDF signing"
    });
  }
};
