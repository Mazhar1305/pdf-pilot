import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const addPageNumbers = async (req, res) => {

  let job = null;

  try {

    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }

    let {
      position = "bottom right",
      startNumber = 1,
      fontSize = 12,
      fontColor = "#000000",
      margin = 20,
      pages = "all"
    } = req.body;

    startNumber = Number(startNumber);
    fontSize = Number(fontSize);
    margin = Number(margin);

    if (fontSize <= 0 || margin < 0) {
      return res.status(400).json({
        error: "Invalid page number parameters"
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
      tool: "page-numbers",
      status: "processing"
    });

    const pdfBytes = fs.readFileSync(req.file.path);

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pdfPages = pdfDoc.getPages();

    const targetPages =
      pages === "all"
        ? pdfPages.map((_, index) => index + 1)
        : pages.split(",").map(p => Number(p.trim()));

    const hex = fontColor.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    let currentNumber = startNumber;

    for (let i = 0; i < pdfPages.length; i++) {

      if (!targetPages.includes(i + 1)) {
        continue;
      }

      const page = pdfPages[i];

      const { width, height } = page.getSize();

      const text = `${currentNumber}`;

      let x = width - margin;
      let y = margin;

      switch (position.toLowerCase()) {

        case "top left":
          x = margin;
          y = height - margin;
          break;

        case "top center":
          x = width / 2;
          y = height - margin;
          break;

        case "top right":
          x = width - margin;
          y = height - margin;
          break;

        case "bottom left":
          x = margin;
          y = margin;
          break;

        case "bottom center":
          x = width / 2;
          y = margin;
          break;

        default:
          x = width - margin;
          y = margin;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        color: rgb(r, g, b)
      });

      currentNumber++;
    }

    const outputBytes = await pdfDoc.save();

    const outputFileName =
      `page-numbers-${Date.now()}-${uuidv4()}.pdf`;

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

    await Job.findByIdAndUpdate(job._id, {
      status: "done",
      outputFile: outputFileName
    });

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {

    if (job) {

      await Job.findByIdAndUpdate(job._id, {
        status: "error"
      });
    }

    return res.status(500).json({
      error: error.message
    });
  }
};