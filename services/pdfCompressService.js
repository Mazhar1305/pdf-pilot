import fs from "fs";
import { exec } from "child_process";
import util from "util";
import { PDFDocument } from "pdf-lib";

const execPromise = util.promisify(exec);

// Ghostscript binary is named differently across platforms.
const GS_CANDIDATES = ["gs", "gswin64c", "gswin32c"];

// Return the first Ghostscript binary that actually responds, or null.
const resolveGhostscript = async () => {
  for (const bin of GS_CANDIDATES) {
    try {
      await execPromise(`${bin} --version`, { timeout: 10000, windowsHide: true });
      return bin;
    } catch {
      // not this one; keep trying
    }
  }
  return null;
};

// Best-quality compression via Ghostscript (downsamples images, etc.).
const compressWithGhostscript = async (bin, inputPath, outputPath) => {
  const command =
    `${bin} -sDEVICE=pdfwrite ` +
    `-dCompatibilityLevel=1.4 ` +
    `-dPDFSETTINGS=/ebook ` +
    `-dNOPAUSE -dQUIET -dBATCH ` +
    `-sOutputFile="${outputPath}" "${inputPath}"`;

  await execPromise(command, { timeout: 120000, windowsHide: true });

  if (!fs.existsSync(outputPath)) {
    throw new Error("Ghostscript did not produce an output file");
  }
};

// Cross-platform fallback: re-save with pdf-lib using object streams. Modest
// compression, but always available (no system dependency) and never fails on
// a valid PDF.
const compressWithPdfLib = async (inputPath, outputPath) => {
  const bytes = fs.readFileSync(inputPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await pdf.save({ useObjectStreams: true });
  fs.writeFileSync(outputPath, out);
};

/**
 * Compress a PDF. Uses Ghostscript when installed (best results), otherwise
 * falls back to a pure-Node pdf-lib re-save so the endpoint always works.
 * Returns the output path.
 */
export async function compressPDF(inputPath, outputPath) {
  const gs = await resolveGhostscript();

  if (gs) {
    try {
      await compressWithGhostscript(gs, inputPath, outputPath);
      return outputPath;
    } catch (err) {
      // Ghostscript present but failed — fall through to the pdf-lib path.
      console.error("Ghostscript compression failed, falling back to pdf-lib:", err.message);
    }
  }

  await compressWithPdfLib(inputPath, outputPath);
  return outputPath;
}
