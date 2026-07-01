import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { v4 as uuidv4 } from "uuid";

import File from "../models/File.js";
import Job from "../models/Job.js";

async function extractPdf(filePath) {

  const data = new Uint8Array(
    fs.readFileSync(filePath)
  );

  const pdf =
    await pdfjsLib.getDocument({
      data,
      disableWorker: true
    }).promise;

  const pages = [];

  for (
    let i = 1;
    i <= pdf.numPages;
    i++
  ) {

    const page =
      await pdf.getPage(i);

    const content =
      await page.getTextContent();

    pages.push(
      content.items
        .map(item => item.str)
        .join(" ")
    );
  }

  return {
    pageCount: pdf.numPages,
    pages
  };
}

export const comparePdf = async (
  req,
  res
) => {

  let job = null;

  try {

    const pdf1 =
      req.files?.pdf1?.[0];

    const pdf2 =
      req.files?.pdf2?.[0];

    if (!pdf1 || !pdf2) {

      return res.status(400).json({
        error:
          "Two PDF files are required"
      });
    }

    await File.create({
      originalName:
        pdf1.originalname,
      fileName:
        pdf1.filename,
      path:
        pdf1.path,
      mimeType:
        pdf1.mimetype,
      size:
        pdf1.size
    });

    await File.create({
      originalName:
        pdf2.originalname,
      fileName:
        pdf2.filename,
      path:
        pdf2.path,
      mimeType:
        pdf2.mimetype,
      size:
        pdf2.size
    });

    job =
      await Job.create({
        tool: "compare",
        status: "processing"
      });

    const first =
      await extractPdf(
        pdf1.path
      );

    const second =
      await extractPdf(
        pdf2.path
      );

    const results = [];

    const maxPages =
      Math.max(
        first.pageCount,
        second.pageCount
      );

    for (
      let i = 0;
      i < maxPages;
      i++
    ) {

      const firstText =
        first.pages[i] || "";

      const secondText =
        second.pages[i] || "";

      results.push({
        page: i + 1,
        status:
          firstText === secondText
            ? "MATCH"
            : "DIFFERENT"
      });
    }

    const report = {
      pageCount1:
        first.pageCount,
      pageCount2:
        second.pageCount,
      differences:
        results.filter(
          r =>
            r.status ===
            "DIFFERENT"
        ).length,
      pages:
        results
    };

    const reportFile =
      `compare-${Date.now()}-${uuidv4()}.json`;

    const reportPath =
      path.join(
        "uploads",
        "output",
        reportFile
      );

    fs.mkdirSync(
      path.dirname(
        reportPath
      ),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        report,
        null,
        2
      )
    );

    await Job.findByIdAndUpdate(
      job._id,
      {
        status: "done",
        outputFile:
          reportFile
      }
    );

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      comparison: report
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
      error:
        error.message
    });
  }
};