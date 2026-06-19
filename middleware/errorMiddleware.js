import multer from "multer";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Maximum allowed size is 50 MB" });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  if (err && err.message === "Only PDF files are accepted") {
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  next();
};
