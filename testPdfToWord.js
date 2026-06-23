import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph } from "docx";

const pdfPath =
  "/Users/ismailqamri/Desktop/TRES/BEE654B-module-1-pdf.pdf";

async function convert() {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let extractedText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const content = await page.getTextContent();

    const text = content.items.map(item => item.str).join(" ");

    extractedText += text + "\n\n";
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph(extractedText)
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);

  fs.writeFileSync(
    "./test-output/BEE654B-module-1.docx",
    buffer
  );

  console.log("DOCX created");
}

convert();