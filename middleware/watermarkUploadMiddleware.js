import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      `${uuidv4()}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {

  const ext =
    path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "pdf") {

    if (ext === ".pdf") {
      return cb(null, true);
    }

    return cb(
      new Error("Only PDF files are accepted"),
      false
    );
  }

  if (file.fieldname === "watermarkImage") {

    if (
      ext === ".png" ||
      ext === ".jpg" ||
      ext === ".jpeg"
    ) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Only PNG, JPG and JPEG watermark images are accepted"
      ),
      false
    );
  }

  cb(
    new Error("Invalid upload field"),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

export default upload;