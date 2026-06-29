import File from "../models/File.js";
import Job from "../models/Job.js";

import { pdf } from "pdf-to-img";
import { promises as fs } from "node:fs";
import path from "path";
import sharp from "sharp";

export const pdfToJpg = async (req, res) => {
  let job = null;

  try {
    // Check if a PDF was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded",
      });
    }

    // Save uploaded file details
    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    // Create Job record
    job = await Job.create({
      tool: "pdf-to-jpg",
      status: "processing",
    });

    // Convert PDF to images
    const document = await pdf(req.file.path, { scale: 3 });

    const outputDir = "uploads/output";
    const imageUrls = [];

    let page = 1;

    for await (const image of document) {
      const imageName = `${path.parse(req.file.filename).name}-page-${page}.jpg`;

      const imagePath = path.join(outputDir, imageName);

      await sharp(image)
        .jpeg({
            quality: 100,
        })
        .toFile(imagePath);

      imageUrls.push(
        `http://localhost:${process.env.PORT}/uploads/output/${imageName}`
      );

      page++;
    }

    // Free memory
    await document.destroy();

    // Update job status
    await Job.findByIdAndUpdate(job._id, {
      status: "done",
    });

    // Return image URLs
    return res.status(200).json({
      success: true,
      jobId: job._id,
      status: "done",
      downloadUrls: imageUrls,
    });
  } catch (error) {
    if (job) {
      await Job.findByIdAndUpdate(job._id, {
        status: "error",
      });
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};