import mongoose from "mongoose";

const wordToPdfSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending"
    },
    inputFile: {
      type: String,
      required: true
    },
    outputFile: {
      type: String,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

const WordToPdf = mongoose.model("WordToPdf", wordToPdfSchema);

export default WordToPdf;
