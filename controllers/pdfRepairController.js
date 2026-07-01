import fs from "fs";
import { repairPDF as repairPdfService } from "../services/pdfRepairService.js";

export const repairPDF = async (req, res) => {

    let inputPath = null;

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

        // The upload middleware uses disk storage, so read the bytes from
        // disk (req.file.buffer is only populated by memory storage).
        inputPath = req.file.path;
        const inputBuffer = fs.readFileSync(inputPath);

        const repairedBuffer =
            await repairPdfService(inputBuffer);

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="repaired.pdf"'
        );

        return res.send(Buffer.from(repairedBuffer));

    }

    catch (err) {

        return res.status(422).json({
            message: "Unable to repair PDF",
            error: err.message
        });

    }

    finally {

        if (inputPath && fs.existsSync(inputPath)) {
            try {
                fs.unlinkSync(inputPath);
            } catch (unlinkErr) {
                console.error("Could not unlink source PDF file:", unlinkErr);
            }
        }

    }

};