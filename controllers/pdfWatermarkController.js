import fs from "fs";
import path from "path";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const addWatermark = async (req, res) => {
  let job = null;

  try {
    const pdfFile = req.files?.pdf?.[0];

    if (!pdfFile) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }

    const {
      watermarkType = "text",
      watermarkText = "CONFIDENTIAL",
      position = "center",
      opacity = 0.3,
      fontSize = 40,
      fontColor = "#808080",
      rotation = 45,
      scale = 0.5,
      pages = "all"
    } = req.body;

    await File.create({
      originalName: pdfFile.originalname,
      fileName: pdfFile.filename,
      path: pdfFile.path,
      mimeType: pdfFile.mimetype,
      size: pdfFile.size
    });

    job = await Job.create({
      tool: "watermark",
      status: "processing"
    });

    const pdfBytes = fs.readFileSync(pdfFile.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pdfPages = pdfDoc.getPages();

    const selectedPages =
      pages === "all"
        ? null
        : pages.split(",").map(p => Number(p.trim()));

    const hex = fontColor.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    for (let i = 0; i < pdfPages.length; i++) {

      if (
        selectedPages &&
        !selectedPages.includes(i + 1)
      ) {
        continue;
      }

      const page = pdfPages[i];

      const { width, height } = page.getSize();

      let x = width / 4;
      let y = height / 2;

      switch (position.toLowerCase()) {

        case "top left":
          x = 30;
          y = height - 80;
          break;

        case "top right":
          x = width - 200;
          y = height - 80;
          break;

        case "bottom left":
          x = 30;
          y = 50;
          break;

        case "bottom right":
          x = width - 200;
          y = 50;
          break;

        default:
          x = width / 4;
          y = height / 2;
      }

      if (
        watermarkType === "image" &&
        req.files?.watermarkImage?.[0]
      ) {

        const imageFile =
          req.files.watermarkImage[0];

        const imageBytes =
          fs.readFileSync(imageFile.path);

        let image;

        if (
          imageFile.mimetype === "image/png"
        ) {
          image = await pdfDoc.embedPng(
            imageBytes
          );
        } else {
          image = await pdfDoc.embedJpg(
            imageBytes
          );
        }

        const dims =
          image.scale(Number(scale));

        page.drawImage(image, {
          x,
          y,
          width: dims.width,
          height: dims.height,
          opacity: Number(opacity),
          rotate: degrees(
            Number(rotation)
          )
        });

      } else {

        page.drawText(watermarkText, {
          x,
          y,
          size: Number(fontSize),
          opacity: Number(opacity),
          rotate: degrees(
            Number(rotation)
          ),
          color: rgb(r, g, b)
        });

      }
    }

    const outputBytes =
      await pdfDoc.save();

    const outputFileName =
      `watermark-${Date.now()}-${uuidv4()}.pdf`;

    const outputPath = path.join(
      "uploads",
      "output",
      outputFileName
    );

    fs.mkdirSync(
      path.dirname(outputPath),
      { recursive: true }
    );

    fs.writeFileSync(
      outputPath,
      outputBytes
    );

    await Job.findByIdAndUpdate(
      job._id,
      {
        status: "done",
        outputFile: outputFileName
      }
    );

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl:
        `/uploads/output/${outputFileName}`
    });

  } catch (error) {

    if (job) {
      await Job.findByIdAndUpdate(
        job._id,
        {
          status: "error"
        }
      );
    }

    return res.status(500).json({
      error: error.message
    });
  }
};