import "dotenv/config";

import fs from "fs";
import path from "path";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

import { GoogleGenAI } from "@google/genai";

import File from "../models/File.js";
import Job from "../models/Job.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const documentChat = async (req, res) => {

  let job = null;

  try {

    if (!req.file) {
      return res.status(400).json({
        error: "No document uploaded"
      });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      user: req.user?._id || null
    });

    job = await Job.create({
      tool: "chat",
      status: "processing",
      user: req.user?._id || null
    });

    let extractedText = "";

    const extension = path
      .extname(req.file.originalname)
      .toLowerCase();

    if (extension === ".pdf") {

      const data = new Uint8Array(
        fs.readFileSync(req.file.path)
      );

      const pdf = await pdfjsLib.getDocument({
        data
      }).promise;

      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);

        const content =
          await page.getTextContent();

        text +=
          content.items
            .map(item => item.str)
            .join(" ") + "\n";

      }

      extractedText = text;

    }

    else if (extension === ".docx") {

      const result =
        await mammoth.extractRawText({
          path: req.file.path
        });

      extractedText = result.value;

    }

    else if (extension === ".txt") {

      extractedText = fs.readFileSync(
        req.file.path,
        "utf8"
      );

    }

    else {

      return res.status(400).json({
        error: "Unsupported document type"
      });

    }

    const prompt = `
You are an AI assistant.

Answer ONLY from the uploaded document.

If the answer is not present in the document, reply exactly:

"I couldn't find that information in the uploaded document."

DOCUMENT:

${extractedText}

QUESTION:

${question}
`;

    let answer = "";

    try {

      const response =
        await ai.models.generateContent({

          model: "gemini-2.5-flash",

          contents: prompt

        });

      answer = response.text;

    }

    catch (error) {

      await Job.findByIdAndUpdate(
        job._id,
        {
          status: "error"
        }
      );

      return res.status(500).json({

        error: "AI processing failed",

        details: error.message

      });

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

      question,

      answer

    });

  }

  catch (error) {

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