const express = require('express');

const router = express.Router();

const upload = require('../middlewares/upload');

const controller =
require('../controllers/pdfRepairController');


router.post(

'/repair',

upload.single('file'),

controller.repairPDF

);

router.post(
    "/repair",
    upload.single("file"),
    pdfRepairController.repairPDF
);


module.exports = router;
