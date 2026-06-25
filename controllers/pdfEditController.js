import fs from "fs";
import path from "path";
import {
  PDFDocument,
  rgb
} from "pdf-lib";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

export const editPdf = async (req, res) => {
  let job = null;

  try {

    const pdfFile =
      req.files?.pdf?.[0];

    if (!pdfFile) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }

    const {
      text = "",
      x = 100,
      y = 500,
      fontSize = 20,
      fontColor = "#000000",
      width = 150,
      height = 150,
      pages = "1"
    } = req.body;

    await File.create({
      originalName:
        pdfFile.originalname,
      fileName:
        pdfFile.filename,
      path:
        pdfFile.path,
      mimeType:
        pdfFile.mimetype,
      size:
        pdfFile.size
    });

    job = await Job.create({
      tool: "edit",
      status: "processing"
    });

    const pdfBytes =
      fs.readFileSync(pdfFile.path);

    const pdfDoc =
      await PDFDocument.load(
        pdfBytes
      );

    const pdfPages =
      pdfDoc.getPages();

    const targetPages =
      pages === "all"
        ? pdfPages.map(
            (_, index) =>
              index + 1
          )
        : pages
            .split(",")
            .map(p =>
              Number(p.trim())
            );

    const hex =
      fontColor.replace("#", "");

    const r =
      parseInt(
        hex.substring(0, 2),
        16
      ) / 255;

    const g =
      parseInt(
        hex.substring(2, 4),
        16
      ) / 255;

    const b =
      parseInt(
        hex.substring(4, 6),
        16
      ) / 255;

    for (
      let i = 0;
      i < pdfPages.length;
      i++
    ) {

      if (
        !targetPages.includes(
          i + 1
        )
      ) {
        continue;
      }

      const page =
        pdfPages[i];

      if (text) {

        page.drawText(text, {
          x: Number(x),
          y: Number(y),
          size:
            Number(fontSize),
          color: rgb(
            r,
            g,
            b
          )
        });
      }

      if (
        req.files?.image?.[0]
      ) {

        const imageFile =
          req.files.image[0];

        const imageBytes =
          fs.readFileSync(
            imageFile.path
          );

        let image;

        if (
          imageFile.mimetype ===
          "image/png"
        ) {
          image =
            await pdfDoc.embedPng(
              imageBytes
            );
        } else {
          image =
            await pdfDoc.embedJpg(
              imageBytes
            );
        }

        page.drawImage(
          image,
          {
            x: Number(x),
            y: Number(y),
            width:
              Number(width),
            height:
              Number(height)
          }
        );
      }
    }

    const outputBytes =
      await pdfDoc.save();

    const outputFileName =
      `edit-${Date.now()}-${uuidv4()}.pdf`;

    const outputPath =
      path.join(
        "uploads",
        "output",
        outputFileName
      );

    fs.mkdirSync(
      path.dirname(
        outputPath
      ),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      outputPath,
      outputBytes
    );

    await Job.findByIdAndUpdate(
      job._id,
      {
        status: "done",
        outputFile:
          outputFileName
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