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

export const explainDocument = async (req, res) => {
  let job = null;
  const inputPath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    // 1. Validate explanation level parameter
    const levelVal = (req.body.level || "intermediate").toLowerCase();
    if (!["beginner", "intermediate", "advanced"].includes(levelVal)) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "level parameter must be 'beginner', 'intermediate', or 'advanced'" });
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
      tool: "explain",
      status: "processing"
    });

    await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // 4. Construct AI Prompt & Generate Explanation
    let audiencePrompt = "";
    if (levelVal === "beginner") {
      audiencePrompt = "Explain this document in simple, easy-to-understand terms suitable for a absolute beginner. Avoid technical jargon, use everyday analogies where possible, and break it down into plain language.";
    } else if (levelVal === "advanced") {
      audiencePrompt = "Explain this document for an advanced technical audience. Highlight the key nuances, underlying structural mechanics, logical flow, and technical implications in detail.";
    } else {
      audiencePrompt = "Explain this document for an intermediate audience. Provide clear context and define complex concepts, but maintain a solid depth of analysis and description.";
    }

    const prompt = `You are an AI document analysis assistant.
Task: ${audiencePrompt}

DOCUMENT CONTENT:
${extractedText}`;

    let explanation = "";
    
    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock") {
      // Mock Explanation Fallback
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      if (levelVal === "beginner") {
        explanation = `[Mock AI Explanation - Beginner] This document contains ${wordCount} words. Here is a simple explanation:\n- What it is about: It is a document discussing ${extractedText.substring(0, 100).replace(/\n/g, ' ')}...\n- Think of it like this: A helpful guide that breaks down concepts into simple, everyday terms without complex jargon.`;
      } else if (levelVal === "advanced") {
        explanation = `[Mock AI Explanation - Advanced] This document contains ${wordCount} words. Below is an advanced technical analysis of key concepts:\n1. Core Mechanics: File uploaded and text parsed successfully.\n2. Technical Context: Word count resolves to ${wordCount} words.\n3. Abstract & Implications: Detailed breakdown of the text starting with: ${extractedText.substring(0, 300).replace(/\n/g, ' ')}...`;
      } else {
        explanation = `[Mock AI Explanation - Intermediate] This document contains ${wordCount} words. The general explanation outlines:\n- Key Themes: The document covers themes surrounding ${extractedText.substring(0, 150).replace(/\n/g, ' ')}...\n- Core Context: A balanced explanation aimed at developers and managers seeking clear details.`;
      }
    } else {
      // Real Google GenAI Call
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        explanation = response.text;
      } catch (aiError) {
        console.error("Gemini API call failed:", aiError);
        job.status = "error";
        await job.save().catch(() => {});
        return res.status(502).json({
          error: "AI document explanation failed. Google Gemini API error encountered.",
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
      explanation
    });

  } catch (error) {
    console.error("explainDocument error:", error);
    
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
      error: error.message || "Internal server error during document explanation"
    });
  }
};
