import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },

  filename: (req, file, cb) => {
    cb(
      null,
      `${uuidv4()}${path.extname(file.originalname)}`
    );
  }
});

const fileFilter = (req, file, cb) => {

  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    ext === ".pdf" ||
    ext === ".docx" ||
    ext === ".txt"
  ) {

    cb(null, true);

  } else {

    cb(
      new Error(
        "Only PDF, DOCX and TXT files are supported."
      ),
      false
    );

  }

};

const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024
  }

});

export default upload;