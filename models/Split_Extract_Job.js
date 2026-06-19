import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "split",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    inputFile: {
      type: String,
      required: true,
    },
    outputFiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SplitExtractFile",
      },
    ],
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("SplitExtractJob", jobSchema);

export default Job;
