import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";
import PDFMerger from "pdf-merger-js";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const performOcr = async (req, res) => {
  let job = null;
  const tempPaths = [];
  let worker = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const inputPath = req.file.path;

    // Check PDF header signature
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString("ascii") !== "%PDF-") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
    }

    // Determine OCR language (default to eng)
    const lang = req.body.lang || "eng";

    // 1. Create Job and File database records
    job = await Job.create({
      tool: "ocr",
      status: "processing"
    });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // Ensure output directories exist
    fs.mkdirSync(path.join("uploads", "output"), { recursive: true });

    // 2. Render PDF pages to images
    const document = await pdf(inputPath, { scale: 1.5 });
    const images = [];
    for await (const image of document) {
      images.push(image);
    }

    if (images.length === 0) {
      throw new Error("No readable pages found in PDF");
    }

    // 3. Initialize Tesseract Worker
    worker = await createWorker(lang);

    // 4. Run OCR for each page and output temporary single-page PDFs
    for (let i = 0; i < images.length; i++) {
      const { data } = await worker.recognize(images[i], {
        pdfTitle: `OCR Page ${i + 1}`
      }, {
        pdf: true
      });

      const pagePdfBuffer = Buffer.from(data.pdf);
      const tempFileName = `tmp-ocr-${job._id}-${i}.pdf`;
      const tempPath = path.join("uploads", "output", tempFileName);

      fs.writeFileSync(tempPath, pagePdfBuffer);
      tempPaths.push(tempPath);
    }

    // 5. Merge all searchable page PDFs
    const merger = new PDFMerger();
    for (const tempPath of tempPaths) {
      await merger.add(tempPath);
    }

    const finalFileName = `ocr-${Date.now()}-${uuidv4()}.pdf`;
    const finalPath = path.join("uploads", "output", finalFileName);
    await merger.save(finalPath);

    // 6. Clean up temporary page PDFs
    for (const tempPath of tempPaths) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }

    // 7. Update job status to done
    await Job.findByIdAndUpdate(job._id, {
      status: "done",
      outputFile: finalFileName
    });

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${finalFileName}`
    });

  } catch (error) {
    console.error("performOcr error:", error);

    // Clean up temporary files on error
    for (const tempPath of tempPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (err) {
        console.error("Temp file cleanup failed for path:", tempPath, err);
      }
    }

    if (job) {
      await Job.findByIdAndUpdate(job._id, {
        status: "error"
      }).catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during OCR processing"
    });
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
};
