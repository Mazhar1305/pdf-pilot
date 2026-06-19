import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import Job from "../models/Job.js";
import File from "../models/File.js";

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
