import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const cropPdf = async (req, res) => {
  let job = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }

    let {
      top = 0,
      bottom = 0,
      left = 0,
      right = 0,
      unit = "points",
      pages = "all"
    } = req.body;

    top = Number(top);
    bottom = Number(bottom);
    left = Number(left);
    right = Number(right);

    if (
      top < 0 ||
      bottom < 0 ||
      left < 0 ||
      right < 0
    ) {
      return res.status(400).json({
        error: "Crop values cannot be negative"
      });
    }

    const factor =
      unit.toLowerCase() === "pixels"
        ? 0.75
        : 1;

    top *= factor;
    bottom *= factor;
    left *= factor;
    right *= factor;

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    job = await Job.create({
      tool: "crop",
      status: "processing"
    });

    const pdfBytes = fs.readFileSync(
      req.file.path
    );

    const pdfDoc = await PDFDocument.load(
      pdfBytes
    );

    const pdfPages = pdfDoc.getPages();

    const selectedPages =
      pages === "all"
        ? null
        : pages
            .split(",")
            .map(p => Number(p.trim()));

    for (let i = 0; i < pdfPages.length; i++) {

      if (
        selectedPages &&
        !selectedPages.includes(i + 1)
      ) {
        continue;
      }

      const page = pdfPages[i];

      const width = page.getWidth();
      const height = page.getHeight();

      const newWidth =
        width - left - right;

      const newHeight =
        height - top - bottom;

      if (
        newWidth <= 0 ||
        newHeight <= 0
      ) {
        return res.status(400).json({
          error: "Invalid crop values"
        });
      }

      page.setCropBox(
        left,
        bottom,
        newWidth,
        newHeight
      );
    }

    const outputBytes =
      await pdfDoc.save();

    const outputFileName =
      `crop-${Date.now()}-${uuidv4()}.pdf`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(
      path.dirname(outputPath),
      { recursive: true }
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