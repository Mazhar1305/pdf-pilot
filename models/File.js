import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      unique: true,
      sparse: true
    },
    originalName: String,
    fileName: String,
    path: String,
    mimeType: String,
    size: Number
  },
  {
    timestamps: true
  }
);

export default mongoose.model("File", fileSchema);