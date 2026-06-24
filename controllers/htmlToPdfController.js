import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.js";
import Job from "../models/Job.js";

// Helper function to validate URL format
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

export const convertHtmlToPdf = async (req, res) => {
  let job = null;
  let browser = null;

  try {
    const { html, url } = req.body;

    // 1. Validation Checks
    if (!html && !url) {
      return res.status(400).json({ error: "Either 'html' or 'url' must be provided." });
    }

    if (html && url) {
      return res.status(400).json({ error: "Provide either 'html' or 'url', but not both." });
    }

    if (url && !isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL provided. Must start with http:// or https://" });
    }

    // 2. Create Job record in processing status
    job = await Job.create({
      tool: "html-to-pdf",
      status: "processing"
    });

    const outputFileName = `html-conv-${Date.now()}-${uuidv4()}.pdf`;
    const outputPath = path.resolve("uploads", "output", outputFileName);

    // Ensure output directories exist
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // 3. Detect pre-installed browser on Windows
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    let executablePath = undefined;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    // Launch headless browser (using local Chrome/Edge if detected)
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // 4. Render based on input type
    if (html) {
      await page.setContent(html, { waitUntil: "networkidle0" });
    } else if (url) {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    }

    // 5. Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        bottom: "1cm",
        left: "1cm",
        right: "1cm"
      }
    });

    // 6. Save PDF to file system
    fs.writeFileSync(outputPath, pdfBuffer);

    // 7. Save file metadata in File collection
    await File.create({
      originalName: html ? "rendered-html.pdf" : `${new URL(url).hostname}.pdf`,
      fileName: outputFileName,
      path: outputPath,
      mimeType: "application/pdf",
      size: pdfBuffer.length
    });

    // 8. Complete job status
    job.status = "done";
    job.outputFile = outputFileName;
    await job.save();

    return res.status(200).json({
      jobId: job._id,
      status: "done",
      downloadUrl: `/uploads/output/${outputFileName}`
    });

  } catch (error) {
    console.error("convertHtmlToPdf error:", error);

    if (job) {
      job.status = "error";
      await job.save().catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Internal server error during HTML to PDF conversion"
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
