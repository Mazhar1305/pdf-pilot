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
    outputFile: String,

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Job", jobSchema);