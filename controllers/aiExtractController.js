import "dotenv/config";

import fs from "fs";
import mime from "mime";

import { GoogleGenAI } from "@google/genai";

import File from "../models/File.js";
import Job from "../models/Job.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const extractDocumentData = async (req, res) => {

  let job = null;

  try {

    if (!req.file) {

      return res.status(400).json({
        error: "No document uploaded"
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

      tool: "extract",

      status: "processing",

      user: req.user?._id || null

    });

    const fileBuffer = fs.readFileSync(
      req.file.path
    );

    const prompt = `
Extract structured information from this invoice, receipt or table.

Return ONLY valid JSON.

If a field is unavailable, return null.

{
  "invoiceNumber": null,
  "invoiceDate": null,
  "vendorName": null,
  "customerName": null,
  "totalAmount": null,
  "taxAmount": null,
  "currency": null,
  "paymentStatus": null,
  "lineItems": [],
  "tableData": []
}
`;

    const response =
      await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: [

          {
            text: prompt
          },

          {

            inlineData: {

              mimeType:
                mime.getType(req.file.path),

              data:
                fileBuffer.toString("base64")

            }

          }

        ]

      });

    let extracted =
      response.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    let json;

    try {

      json = JSON.parse(extracted);

    }

    catch {

      json = {
        raw: extracted
      };

    }

    await Job.findByIdAndUpdate(

      job._id,

      {

        status: "done"

      }

    );

    return res.status(200).json({

      jobId: job._id,

      status: "done",

      extractedData: json

    });

  }

  catch (error) {

    console.error(error);

    if (job) {

      await Job.findByIdAndUpdate(

        job._id,

        {

          status: "error"

        }

      );

    }

    return res.status(500).json({

      error: "AI extraction failed",

      details: error.message

    });

  }

};