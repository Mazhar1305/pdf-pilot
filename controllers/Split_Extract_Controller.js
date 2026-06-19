import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import Job from "../models/Split_Extract_Job.js";
import File from "../models/Split_Extract_File.js";

const parsePageRange = (rangeStr, totalPages) => {
  const pages = new Set();
  const segments = rangeStr.split(",").map((s) => s.trim());

  for (const segment of segments) {
    if (segment.includes("-")) {
      const parts = segment.split("-").map((s) => s.trim());

      if (parts.length !== 2 || parts.some((p) => p === "")) {
        throw { status: 400, message: `Invalid page range segment: "${segment}"` };
      }

      const start = Number(parts[0]);
      const end = Number(parts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end) || isNaN(start) || isNaN(end)) {
        throw { status: 400, message: `Invalid page range segment: "${segment}"` };
      }

      if (start < 1 || end < 1) {
        throw { status: 400, message: `Page numbers must be 1 or greater` };
      }

      if (start > end) {
        throw { status: 400, message: `Invalid range "${segment}": start must be ≤ end` };
      }

      if (end > totalPages) {
        throw {
          status: 400,
          message: `Page ${end} does not exist (PDF has ${totalPages} pages)`,
        };
      }

      for (let i = start; i <= end; i++) {
        pages.add(i - 1);
      }
    } else {
      const page = Number(segment);

      if (!Number.isInteger(page) || isNaN(page)) {
        throw { status: 400, message: `Invalid page number: "${segment}"` };
      }

      if (page < 1) {
        throw { status: 400, message: `Page numbers must be 1 or greater` };
      }

      if (page > totalPages) {
        throw {
          status: 400,
          message: `Page ${page} does not exist (PDF has ${totalPages} pages)`,
        };
      }

      pages.add(page - 1);
    }
  }

  if (pages.size === 0) {
    throw { status: 400, message: "Page range resolved to no pages" };
  }

  return Array.from(pages).sort((a, b) => a - b);
};

const chunkByN = (totalPages, n) => {
  const chunks = [];
  for (let i = 0; i < totalPages; i += n) {
    const chunk = [];
    for (let j = i; j < Math.min(i + n, totalPages); j++) {
      chunk.push(j);
    }
    chunks.push(chunk);
  }
  return chunks;
};

export const splitPdf = async (req, res) => {
  let job = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const inputPath = req.file.path;

    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(inputPath, "r");
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString("ascii") !== "%PDF-") {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
    }

    const { mode, range, n } = req.body;

    if (!mode) {
      return res.status(400).json({ error: "mode is required: 'range' or 'nPages'" });
    }

    if (mode !== "range" && mode !== "nPages") {
      return res.status(400).json({ error: "mode must be 'range' or 'nPages'" });
    }

    if (mode === "range" && !range) {
      return res.status(400).json({ error: "range parameter required for mode=range" });
    }

    if (mode === "nPages" && (n === undefined || n === null || n === "")) {
      return res.status(400).json({ error: "n parameter required for mode=nPages" });
    }

    if (mode === "nPages") {
      const nNum = Number(n);
      if (!Number.isInteger(nNum) || isNaN(nNum) || nNum < 1) {
        return res.status(400).json({ error: "n must be a positive integer" });
      }
    }

    job = await Job.create({
      type: "split",
      status: "pending",
      params: { mode, range: range || null, n: n || null },
      inputFile: req.file.originalname,
      outputFiles: [],
    });

    job.status = "processing";
    await job.save();

    const pdfBytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(pdfBytes);
    const totalPages = srcPdf.getPageCount();

    let chunks;

    if (mode === "range") {
      const pages = parsePageRange(range, totalPages);
      chunks = [pages];
    } else {
      const nNum = Number(n);
      if (nNum > totalPages) {
        return res.status(400).json({
          error: `n exceeds total page count (PDF has ${totalPages} pages)`,
        });
      }
      chunks = chunkByN(totalPages, nNum);
    }

    const outputMeta = [];

    for (const pageIndices of chunks) {
      const outPdf = await PDFDocument.create();
      const copiedPages = await outPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((p) => outPdf.addPage(p));

      const outBytes = await outPdf.save();
      const outFileName = `${uuidv4()}.pdf`;
      const outPath = path.join("uploads", "output", outFileName);

      fs.writeFileSync(outPath, outBytes);

      const downloadUrl = `/uploads/output/${outFileName}`;

      const fileDoc = await File.create({
        originalName: req.file.originalname,
        storedName: outFileName,
        path: outPath,
        size: outBytes.length,
        mimeType: "application/pdf",
        downloadUrl,
        jobId: job._id,
      });

      job.outputFiles.push(fileDoc._id);

      outputMeta.push({
        filename: outFileName,
        downloadUrl,
        pages: pageIndices.length,
      });
    }

    job.status = "done";
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      files: outputMeta,
    });
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }

    if (job) {
      job.status = "failed";
      job.error = err.message || "Unknown error";
      await job.save().catch(() => {});
    }

    console.error("splitPdf error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const extractPages = async (req, res) => {

  let job = null;

  try {

    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded"
      });
    }


    const inputPath = req.file.path;


    const buffer = Buffer.alloc(5);

    const fd = fs.openSync(inputPath, "r");

    fs.readSync(fd, buffer, 0, 5, 0);

    fs.closeSync(fd);


    if (buffer.toString("ascii") !== "%PDF-") {

      fs.unlinkSync(inputPath);

      return res.status(400).json({

        error: "Uploaded file is not a valid PDF"

      });

    }



    let { pages } = req.body;



    if (!pages) {

      return res.status(400).json({

        error: "pages parameter is required"

      });

    }



    try {

      pages = typeof pages === "string"

        ? JSON.parse(pages)

        : pages;

    }

    catch {

      return res.status(400).json({

        error: "pages must be a valid array"

      });

    }



    if (

      !Array.isArray(pages)

      ||

      pages.length === 0

    ) {

      return res.status(400).json({

        error: "pages must be a non-empty array"

      });

    }



    const pdfBytes = fs.readFileSync(inputPath);

    const srcPdf = await PDFDocument.load(pdfBytes);

    const totalPages = srcPdf.getPageCount();



    const uniquePages =

      [...new Set(pages)]

      .sort((a, b) => a - b);



    for (const p of uniquePages) {


      if (!Number.isInteger(p)) {

        return res.status(400).json({

          error: `Invalid page number ${p}`

        });

      }


      if (

        p < 1 ||

        p > totalPages

      ) {

        return res.status(400).json({

          error:

            `Page ${p} does not exist (PDF has ${totalPages} pages)`

        });

      }

    }



    job = await Job.create({

      type: "extract-pages",

      status: "pending",

      params: {

        pages

      },

      inputFile: req.file.originalname,

      outputFiles: []

    });



    job.status = "processing";

    await job.save();



    const outPdf = await PDFDocument.create();



    const copiedPages =

      await outPdf.copyPages(

        srcPdf,

        uniquePages.map(

          p => p - 1

        )

      );



    copiedPages.forEach(

      page => outPdf.addPage(page)

    );



    const outBytes = await outPdf.save();



    const outFileName = `${uuidv4()}.pdf`;



    const outPath = path.join(

      "uploads",

      "output",

      outFileName

    );



    fs.writeFileSync(

      outPath,

      outBytes

    );



    const downloadUrl =

      `/uploads/output/${outFileName}`;



    const fileDoc = await File.create({

      originalName:

        req.file.originalname,


      storedName:

        outFileName,


      path:

        outPath,


      size:

        outBytes.length,


      mimeType:

        "application/pdf",


      downloadUrl,


      jobId:

        job._id

    });



    job.outputFiles.push(

      fileDoc._id

    );


    job.status = "done";


    await job.save();



    return res.status(200).json({

      jobId:

        job._id,


      status:

        "done",


      downloadUrl

    });


  }

  catch (err) {


    if (job) {

      job.status = "failed";

      job.error = err.message;


      await job.save()

        .catch(() => {});

    }



    console.error(

      "extractPages error:",

      err

    );


    return res.status(500).json({

      error:

        "Internal server error"

    });

  }

};
