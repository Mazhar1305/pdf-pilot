import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    tool: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["processing", "done", "error"],
      default: "processing"
    },
    outputFile: String
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Job", jobSchema);