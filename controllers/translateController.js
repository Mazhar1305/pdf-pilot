import "dotenv/config";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import File from "../models/File.js";
import Job from "../models/Job.js";

// Initialize Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "mock"
});

export const translateDocument = async (req, res) => {
  let job = null;
  const inputPath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    // 1. Validate targetLanguage parameter
    const { targetLanguage } = req.body;
    if (!targetLanguage || typeof targetLanguage !== "string" || targetLanguage.trim() === "") {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "targetLanguage parameter is required and must be a non-empty string" });
    }

    // 2. Extract text depending on file extension
    const extension = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";

    if (extension === ".pdf") {
      const data = new Uint8Array(fs.readFileSync(inputPath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
      extractedText = text;
    } else if (extension === ".docx") {
      const result = await mammoth.extractRawText({ path: inputPath });
      extractedText = result.value;
    } else if (extension === ".txt") {
      extractedText = fs.readFileSync(inputPath, "utf8");
    } else {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Unsupported document format. Only PDF, DOCX, and TXT are supported." });
    }

    if (!extractedText || extractedText.trim() === "") {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "The uploaded document contains no readable text." });
    }

    // 3. Create Job and File database entries
    job = await Job.create({
      tool: "translate",
      status: "processing"
    });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // 4. Construct AI Prompt & Generate Translation
    const prompt = `You are a document translation assistant.
Please translate the document contents provided below into ${targetLanguage}.
Preserve the meaning, structure, and general formatting as much as possible.

DOCUMENT CONTENT:
${extractedText}`;

    let translatedContent = "";
    
    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock") {
      // Mock Translation Fallback
      translatedContent = `[Mock AI Translation to ${targetLanguage}]\n- Translated Text:\n${extractedText.substring(0, 300)}...`;
    } else {
      // Real Google GenAI Call
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        translatedContent = response.text;
      } catch (aiError) {
        console.error("Gemini API call failed:", aiError);
        job.status = "error";
        await job.save().catch(() => {});
        return res.status(502).json({
          error: "AI document translation failed. Google Gemini API error encountered.",
          details: aiError.message
        });
      }
    }

    // 5. Update Job record to complete
    job.status = "done";
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      targetLanguage,
      translatedContent
    });

  } catch (error) {
    console.error("translateDocument error:", error);
    
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (unlinkErr) {
        console.error("Could not delete uploaded input file:", unlinkErr);
      }
    }

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during document translation"
    });
  }
};
