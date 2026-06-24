import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const pdfToExcel = async (req, res) => {
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
      tool: "pdf-to-excel",
      status: "processing"
    });

    const data = new Uint8Array(
      fs.readFileSync(req.file.path)
    );

    const pdf = await pdfjsLib.getDocument({
      data
    }).promise;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PDF Data");

    worksheet.columns = [
      { header: "Page", key: "page", width: 15 },
      { header: "Content", key: "content", width: 100 }
    ];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

      const page = await pdf.getPage(pageNum);

      const content = await page.getTextContent();

      const text = content.items
        .map(item => item.str)
        .join(" ");

      worksheet.addRow({
        page: pageNum,
        content: text
      });
    }

    const outputFileName =
      `pdf-to-excel-${Date.now()}-${uuidv4()}.xlsx`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(
      path.dirname(outputPath),
      { recursive: true }
    );

    await workbook.xlsx.writeFile(outputPath);

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