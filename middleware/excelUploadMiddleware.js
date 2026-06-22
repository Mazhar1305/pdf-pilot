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
  const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === xlsxMime || ext === ".xlsx") {
    cb(null, true);
  } else {
    cb(new Error("Only Excel documents (.xlsx) are accepted"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

export const uploadExcel = upload.single("excel");

export default upload;
