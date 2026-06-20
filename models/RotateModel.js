import mongoose from "mongoose";

const rotateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending"
    },
    params: {
      pages: {
        type: [Number],
        required: true
      },
      angle: {
        type: Number,
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

const Rotate = mongoose.model("Rotate", rotateSchema);

export default Rotate;
