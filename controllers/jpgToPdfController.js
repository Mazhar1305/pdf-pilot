import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const jpgToPdf = async (req, res) => {
  let job = null;

  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "At least one JPG/JPEG image is required"
      });
    }

    job = await Job.create({
      tool: "jpg-to-pdf",
      status: "processing"
    });

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      await File.create({
        originalName: file.originalname,
        fileName: file.filename,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size
      });

      const imageBytes = fs.readFileSync(file.path);

      const image = await pdfDoc.embedJpg(imageBytes);

      const { width, height } = image.scale(1);

      const page = pdfDoc.addPage([width, height]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height
      });
    }

    const pdfBytes = await pdfDoc.save();

    const outputFileName = `jpg-to-pdf-${Date.now()}-${uuidv4()}.pdf`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(path.dirname(outputPath), {
      recursive: true
    });

    fs.writeFileSync(outputPath, pdfBytes);

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