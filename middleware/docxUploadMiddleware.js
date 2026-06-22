import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/input/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept standard docx files
  const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  // Some browsers might submit different MIME types, so we can also check by file extension
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === docxMime || ext === ".docx") {
    cb(null, true);
  } else {
    cb(new Error("Only Word documents (.docx) are accepted"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

export const uploadDocx = upload.single("docx");

export default upload;
