const express = require("express");
const router = express.Router();

const pdfController = require("../controllers/pdfController");
const upload = require("../middleware/uploadMiddleware");

router.post(
  "/merge",
  upload.array("files", 20),
  pdfController.mergePDFs
);

module.exports = router;