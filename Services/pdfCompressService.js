import fs from "fs";
import { exec } from "child_process";

export function compressPDF(inputPath, outputPath) {
    return new Promise((resolve, reject) => {

        const command =
            `gswin64c -sDEVICE=pdfwrite ` +
            `-dCompatibilityLevel=1.4 ` +
            `-dPDFSETTINGS=/ebook ` +
            `-dNOPAUSE ` +
            `-dQUIET ` +
            `-dBATCH ` +
            `-sOutputFile="${outputPath}" ` +
            `"${inputPath}"`;

        exec(command, (err) => {

            if (err) {
                return reject(
                    new Error("PDF compression failed")
                );
            }

            if (!fs.existsSync(outputPath)) {
                return reject(
                    new Error("Compressed file not created")
                );
            }

            resolve(outputPath);

        });
    });
}