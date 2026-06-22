import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

const execPromise = util.promisify(exec);

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

    // Create Job record with tool: "excel-to-pdf"
    job = await Job.create({
      tool: "excel-to-pdf",
      status: "processing"
    });

    // Save uploaded file details in the File model
    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    const outputFileName = `excel-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outputPath = path.resolve("uploads", "output", outputFileName);

    // Make sure output folder exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // PowerShell script to automate Microsoft Excel COM
    const psScript = [
      `$excel = New-Object -ComObject Excel.Application;`,
      `$excel.Visible = $false;`,
      `$excel.DisplayAlerts = $false;`,
      `$workbook = $excel.Workbooks.Open('${inputPath}');`,
      `$workbook.ExportAsFixedFormat(0, '${outputPath}');`, // 0 represents xlTypePDF
      `$workbook.Close($false);`,
      `$excel.Quit();`
    ].join(" ");

    // Execute PowerShell subprocess
    await execPromise(`powershell -NoProfile -Command "${psScript}"`);

    // Verify output file was successfully generated
    if (!fs.existsSync(outputPath)) {
      throw new Error("PowerShell script completed but PDF was not generated");
    }

    // Update job status to done
    job.status = "done";
    job.outputFile = outputFileName;
    await job.save();

    // Clean up/unlink the uploaded Excel file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {
    console.error("convertExcelToPdf error:", error);

    // Clean up uploaded file if it still exists
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
