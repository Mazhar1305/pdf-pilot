import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const redactPdf = async (req, res) => {
  let job = null;

  try {

    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }

    let {
      x = 100,
      y = 500,
      width = 200,
      height = 40,
      pages = "all"
    } = req.body;

    x = Number(x);
    y = Number(y);
    width = Number(width);
    height = Number(height);

    if (
      width <= 0 ||
      height <= 0
    ) {
      return res.status(400).json({
        error: "Invalid redact dimensions"
      });
    }

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    job = await Job.create({
      tool: "redact",
      status: "processing"
    });

    const pdfBytes = fs.readFileSync(
      req.file.path
    );

    const pdfDoc = await PDFDocument.load(
      pdfBytes
    );

    const pdfPages = pdfDoc.getPages();

    const targetPages =
      pages === "all"
        ? pdfPages.map((_, index) => index + 1)
        : pages
            .split(",")
            .map(p => Number(p.trim()));

    for (let i = 0; i < pdfPages.length; i++) {

      if (!targetPages.includes(i + 1)) {
        continue;
      }

      const page = pdfPages[i];

      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0, 0, 0)
      });
    }

    const outputBytes = await pdfDoc.save();

    const outputFileName =
      `redact-${Date.now()}-${uuidv4()}.pdf`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(
      path.dirname(outputPath),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      outputPath,
      outputBytes
    );

    await Job.findByIdAndUpdate(
      job._id,
      {
        status: "done",
        outputFile: outputFileName
      }
    );

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl:
        `/uploads/output/${outputFileName}`
    });

  } catch (error) {

    if (job) {
      await Job.findByIdAndUpdate(
        job._id,
        {
          status: "error"
        }
      );
    }

    return res.status(500).json({
      error: error.message
    });
  }
};