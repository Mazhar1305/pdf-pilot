import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import PptxGenJS from "pptxgenjs";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const pdfToPpt = async (req, res) => {
  let job = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded"
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
      tool: "pdf-to-ppt",
      status: "processing"
    });

    const data = new Uint8Array(
      fs.readFileSync(req.file.path)
    );

    const pdf = await pdfjsLib.getDocument({
      data
    }).promise;

    const pptx = new PptxGenJS();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

      const page = await pdf.getPage(pageNum);

      const content = await page.getTextContent();

      const text = content.items
        .map(item => item.str)
        .join(" ");

      const slide = pptx.addSlide();

      slide.addText(
        `Page ${pageNum}`,
        {
          x: 0.5,
          y: 0.3,
          w: 3,
          h: 0.5,
          fontSize: 20,
          bold: true
        }
      );

      slide.addText(
        text,
        {
          x: 0.5,
          y: 1,
          w: 9,
          h: 4,
          fontSize: 10
        }
      );
    }

    const outputFileName =
      `pdf-to-ppt-${Date.now()}-${uuidv4()}.pptx`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(
      path.dirname(outputPath),
      { recursive: true }
    );

    await pptx.writeFile({
      fileName: outputPath
    });

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