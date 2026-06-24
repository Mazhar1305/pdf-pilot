import path from "path";
import fs from "fs";

import { compressPDF }
from "../services/pdfCompressService.js";


export const compressPdf = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        if (req.file.size === 0) {
            return res.status(400).json({
                message: "Uploaded file is empty"
            });
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({
                message: "Only PDF files are allowed"
            });
        }


        const inputPath = req.file.path;

        const outputPath = path.join(
            "uploads/output",
            `compressed-${Date.now()}.pdf`
        );


        await compressPDF(
            inputPath,
            outputPath
        );


        return res.download(
            outputPath,
            "compressed.pdf",
            () => {

                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }

            }
        );

    }

    catch (err) {

        return res.status(422).json({

            message:
            "Unable to compress PDF",

            error:
            err.message

        });

    }

};