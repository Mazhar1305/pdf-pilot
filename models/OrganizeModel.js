import mongoose from "mongoose";

const organizeSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending"
    },
    params: {
      order: {
        type: [Number],
        required: true
      }
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

const Organize = mongoose.model("Organize", organizeSchema);

export default Organize;
