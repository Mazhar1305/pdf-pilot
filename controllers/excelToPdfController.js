import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";
import { htmlToPdfBuffer } from "../services/htmlToPdfService.js";

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Render a cell value (handles ExcelJS rich text / formula / date objects).
const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") {
    if (value.text) return value.text;
    if (value.result !== undefined) return value.result;
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
    if (value.hyperlink) return value.hyperlink;
    return "";
  }
  return value;
};

// Cross-platform XLSX -> PDF:
//   ExcelJS reads the workbook and renders each sheet as an HTML table, then
//   headless Chromium renders the HTML to PDF. Replaces the previous Microsoft
//   Excel COM automation (Windows-only, unsupported for server use).
export const convertExcelToPdf = async (req, res) => {
  let job = null;
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    inputPath = path.resolve(req.file.path);

    // Validate XLSX header (ZIP magic signature: 50 4B 03 04)
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (buffer.toString("hex") !== "504b0304") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid XLSX file" });
    }

    job = await Job.create({ tool: "excel-to-pdf", status: "processing" });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    const outputFileName = `excel-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outputPath = path.resolve("uploads", "output", outputFileName);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // 1. Read workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputPath);

    // 2. Build an HTML table per worksheet
    let sheetsHtml = "";
    workbook.eachSheet((sheet) => {
      let rows = "";
      sheet.eachRow({ includeEmpty: false }, (row) => {
        let cells = "";
        // row.values is 1-based; index 0 is unused
        const values = row.values.slice(1);
        for (const v of values) {
          cells += `<td>${escapeHtml(cellText(v))}</td>`;
        }
        rows += `<tr>${cells}</tr>`;
      });
      sheetsHtml += `<h2>${escapeHtml(sheet.name)}</h2><table>${rows}</table>`;
    });

    if (!sheetsHtml) {
      sheetsHtml = "<p>(workbook contains no data)</p>";
    }

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; }
      h2 { font-size: 12pt; margin: 12px 0 6px; }
      table { border-collapse: collapse; margin-bottom: 18px; }
      td, th { border: 1px solid #999; padding: 3px 8px; white-space: nowrap; }
    </style>
  </head>
  <body>${sheetsHtml}</body>
</html>`;

    // 3. HTML -> PDF (landscape suits wide spreadsheets)
    const pdfBuffer = await htmlToPdfBuffer(html, { landscape: true });
    fs.writeFileSync(outputPath, pdfBuffer);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    job.status = "done";
    job.outputFile = outputFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {
    console.error("convertExcelToPdf error:", error);

    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not unlink source XLSX file on error:", unlinkErr);
      }
    }

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during document conversion"
    });
  }
};
