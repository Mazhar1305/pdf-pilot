import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

import File from "../models/File.js";
import Job from "../models/Job.js";

const execAsync = promisify(exec);

export const pptToPdf = async (req, res) => {
  let job = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No PPTX file uploaded"
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== ".pptx") {
      return res.status(400).json({
        message: "Only PPTX files are allowed"
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
      tool: "ppt-to-pdf",
      status: "processing"
    });

    const outputDir = path.join("uploads", "output");

    fs.mkdirSync(outputDir, { recursive: true });

    const sofficePath = "/opt/homebrew/bin/soffice";

    await execAsync(
      `"${sofficePath}" --headless --convert-to pdf "${req.file.path}" --outdir "${outputDir}"`
    );

    const pdfFileName =
      path.basename(req.file.filename, path.extname(req.file.filename)) + ".pdf";

    const pdfPath = path.join(outputDir, pdfFileName);

    if (!fs.existsSync(pdfPath)) {
      throw new Error("PDF conversion failed");
    }

    await Job.findByIdAndUpdate(job._id, {
      status: "done",
      outputFile: pdfFileName
    });

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${pdfFileName}`
    });

  } catch (error) {

    if (job) {
      await Job.findByIdAndUpdate(job._id, {
        status: "error"
      });
    }

    return res.status(500).json({
      message: error.message
    });
  }
};