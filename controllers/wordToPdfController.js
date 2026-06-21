import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import WordToPdf from "../models/WordToPdfModel.js";

const execPromise = util.promisify(exec);

export const convertWordToPdf = async (req, res) => {
  let job = null;
  let inputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Word file uploaded" });
    }

    inputPath = path.resolve(req.file.path);

    // Validate DOCX header (ZIP magic signature: 50 4B 03 04)
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (buffer.toString("hex") !== "504b0304") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid DOCX file" });
    }

    // Create WordToPdf state record
    job = await WordToPdf.create({
      status: "pending",
      inputFile: req.file.originalname
    });

    job.status = "processing";
    await job.save();

    // Log the file details in File model
    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    const outputFileName = `conv-${Date.now()}-${uuidv4()}.pdf`;
    const outputPath = path.resolve("uploads", "output", outputFileName);

    // Make sure output folder exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // PowerShell script to automate Microsoft Word COM
    const psScript = [
      `$word = New-Object -ComObject Word.Application;`,
      `$word.Visible = $false;`,
      `$doc = $word.Documents.Open('${inputPath}');`,
      `$doc.SaveAs('${outputPath}', 17);`, // 17 is wdFormatPDF
      `$doc.Close();`,
      `$word.Quit();`
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

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {
    console.error("convertWordToPdf error:", error);

    // Clean up uploaded file if it still exists
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not unlink source DOCX file on error:", unlinkErr);
      }
    }

    if (job) {
      job.status = "failed";
      job.error = error.message || "Unknown conversion error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during document conversion"
    });
  }
};
