import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import OrganizeJob from "../models/OrganizeModel.js";

export const organizePdf = async (req, res) => {
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

    let { order } = req.body;

    if (!order) {
      return res.status(400).json({ error: "order parameter is required" });
    }

    try {
      order = typeof order === "string" ? JSON.parse(order) : order;
    } catch {
      return res.status(400).json({ error: "order must be a valid array" });
    }

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: "order must be a non-empty array" });
    }

    const pdfBytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    if (order.length !== totalPages) {
      return res.status(400).json({
        error: `Order array length (${order.length}) must match PDF page count (${totalPages})`
      });
    }

    const seen = new Set();
    for (const p of order) {
      const pNum = Number(p);
      if (!Number.isInteger(pNum) || pNum < 1 || pNum > totalPages) {
        return res.status(400).json({
          error: `Page ${p} is invalid (PDF has ${totalPages} pages)`
        });
      }
      if (seen.has(pNum)) {
        return res.status(400).json({
          error: `Duplicate page number ${pNum} detected in order array`
        });
      }
      seen.add(pNum);
    }

    for (let i = 1; i <= totalPages; i++) {
      if (!seen.has(i)) {
        return res.status(400).json({
          error: `Missing page number ${i} in order array`
        });
      }
    }

    job = await OrganizeJob.create({
      status: "pending",
      params: { order },
      inputFile: req.file.originalname
    });

    job.status = "processing";
    await job.save();

    const destPdf = await PDFDocument.create();
    for (const p of order) {
      const pageIndex = p - 1;
      const [copiedPage] = await destPdf.copyPages(srcPdf, [pageIndex]);
      destPdf.addPage(copiedPage);
    }

    const outBytes = await destPdf.save();
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
