import fs from "fs";
import path from "path";
import { PDFDocument, degrees } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import RotateJob from "../models/RotateModel.js";

export const rotatePdf = async (req, res) => {
  let job = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const inputPath = req.file.path;

    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString("ascii") !== "%PDF-") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
    }

    let { pages, angle } = req.body;

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

    const angleNum = Number(angle);
    if (![90, 180, 270].includes(angleNum)) {
      return res.status(400).json({ error: "angle must be 90, 180, or 270" });
    }

    const pdfBytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    const uniquePages = [...new Set(pages)].sort((a, b) => a - b);

    for (const p of uniquePages) {
      const pNum = Number(p);
      if (!Number.isInteger(pNum) || pNum < 1 || pNum > totalPages) {
        return res.status(400).json({
          error: `Page ${p} is invalid (PDF has ${totalPages} pages)`
        });
      }
    }

    job = await RotateJob.create({
      status: "pending",
      params: { pages: uniquePages, angle: angleNum },
      inputFile: req.file.originalname
    });

    job.status = "processing";
    await job.save();

    for (const p of uniquePages) {
      const pageIndex = p - 1;
      const page = srcPdf.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + angleNum) % 360;
      page.setRotation(degrees(newRotation));
    }

    const outBytes = await srcPdf.save();
    const outFileName = `${uuidv4()}.pdf`;
    const outPath = path.join("uploads", "output", outFileName);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, outBytes);

    const downloadUrl = `/uploads/output/${outFileName}`;

    job.status = "done";
    job.outputFile = outFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl
    });

  } catch (err) {
    if (job) {
      job.status = "failed";
      job.error = err.message || "Unknown error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};
