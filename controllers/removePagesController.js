import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import Job from "../models/Job.js";

export const removePages = async (req, res) => {
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

    let { pages } = req.body;

    if (!pages) {
      return res.status(400).json({ error: "pages parameter is required" });
    }

    try {
      pages = typeof pages === "string" ? JSON.parse(pages) : pages;
    } catch {
      return res.status(400).json({ error: "pages must be a valid array" });
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: "pages must be a non-empty array" });
    }

    const pdfBytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    const uniquePages = [...new Set(pages)].sort((a, b) => a - b);

    // 2. Validate page range bounds
    for (const p of uniquePages) {
      const pNum = Number(p);
      if (!Number.isInteger(pNum) || pNum < 1 || pNum > totalPages) {
        return res.status(400).json({
          error: `Page ${p} is invalid (PDF has ${totalPages} pages)`
        });
      }
    }

    // 3. Ensure resulting PDF has at least one page
    if (uniquePages.length >= totalPages) {
      return res.status(400).json({
        error: "Cannot remove all pages from a PDF. A PDF must contain at least one page."
      });
    }

    // 4. Create Job & File records
    job = await Job.create({
      tool: "remove-pages",
      status: "processing"
    });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // 5. Selectively copy pages
    const removeSet = new Set(uniquePages.map((p) => p - 1));
    const destPdf = await PDFDocument.create();

    const pagesToKeep = [];
    for (let i = 0; i < totalPages; i++) {
      if (!removeSet.has(i)) {
        pagesToKeep.push(i);
      }
    }

    const copiedPages = await destPdf.copyPages(srcPdf, pagesToKeep);
    copiedPages.forEach((page) => destPdf.addPage(page));

    const outBytes = await destPdf.save();
    const outFileName = `remove-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outPath = path.resolve("uploads", "output", outFileName);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, outBytes);

    const downloadUrl = `/uploads/output/${outFileName}`;

    // 6. Complete job
    job.status = "done";
    job.outputFile = outFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl
    });

  } catch (error) {
    console.error("removePages error:", error);

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during PDF page removal"
    });
  }
};
