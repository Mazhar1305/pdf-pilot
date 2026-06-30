import "dotenv/config";

import { GoogleGenAI } from "@google/genai";

import Job from "../models/Job.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const generateDocument = async (req, res) => {

  let job = null;

  try {

    const {

      prompt,

      documentType = "Document"

    } = req.body;

    if (!prompt) {

      return res.status(400).json({

        error: "Prompt is required"

      });

    }

    job = await Job.create({

      tool: "generate",

      status: "processing"

    });

    const aiPrompt = `
Generate a professional ${documentType}.

User Request:

${prompt}

Return only the generated document.
`;

    const response =
      await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: aiPrompt

      });

    await Job.findByIdAndUpdate(

      job._id,

      {

        status: "done"

      }

    );

    return res.status(200).json({

      jobId: job._id,

      status: "done",

      documentType,

      content: response.text

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

      error: "AI generation failed",

      details: error.message

    });

  }

};