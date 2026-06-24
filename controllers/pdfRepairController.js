const repairService = require("../services/pdfRepairService");

exports.repairPDF = async (req, res) => {
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

        const repairedBuffer =
            await repairService.repairPDF(req.file.buffer);

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="repaired.pdf"'
        );

        return res.send(Buffer.from(repairedBuffer));

    } catch (err) {

        return res.status(422).json({
            message: "Unable to repair PDF",
            error: err.message
        });

    }
};