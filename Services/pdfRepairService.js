const { PDFDocument } = require("pdf-lib");

async function repairPDF(buffer) {
    try {
        const pdf = await PDFDocument.load(buffer, {
            ignoreEncryption: true
        });

        const repaired = await PDFDocument.create();

        const pages = await repaired.copyPages(
            pdf,
            pdf.getPageIndices()
        );

        pages.forEach(page => repaired.addPage(page));

        return await repaired.save();
    } catch (err) {
        throw new Error("PDF is corrupted and cannot be repaired");
    }
}

module.exports = { repairPDF };