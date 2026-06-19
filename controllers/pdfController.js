import PDFMerger from "pdf-merger-js";
import path from "path";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const mergePDFs = async (req, res) => {
  let job;

  try {
    const files = req.files;

    if (!files || files.length < 2) {
      return res.status(400).json({
        message: "At least 2 PDF files are required"
      });
    }

    job = await Job.create({
      tool: "merge",
      status: "processing"
    });

    const merger = new PDFMerger();

    for (const file of files) {
      await merger.add(file.path);

      await File.create({
        originalName: file.originalname,
        fileName: file.filename,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size
      });
    }

    const mergedFileName = `merged-${Date.now()}.pdf`;
    const mergedPath = path.join("uploads", mergedFileName);

    await merger.save(mergedPath);

    await Job.findByIdAndUpdate(job._id, {
      status: "done",
      outputFile: mergedFileName
    });

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/${mergedFileName}`
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