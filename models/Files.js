const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalName: String,
  fileName: String,
  path: String,
  mimeType: String,
  size: Number
});

module.exports = mongoose.model("File", fileSchema);