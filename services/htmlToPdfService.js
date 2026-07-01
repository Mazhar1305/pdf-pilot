import fs from "fs";
import puppeteer from "puppeteer";

// Common locations for a pre-installed Chromium-based browser on Windows.
// On Linux/containers none of these exist, so we fall back to the Chromium
// that Puppeteer downloads (executablePath = undefined).
const WINDOWS_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

const detectBrowser = () => {
  for (const p of WINDOWS_BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

/**
 * Render an HTML string to a PDF Buffer using headless Chromium.
 * Cross-platform and safe for unattended/server use.
 */
export async function htmlToPdfBuffer(html, options = {}) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: detectBrowser(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
      ...options
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
