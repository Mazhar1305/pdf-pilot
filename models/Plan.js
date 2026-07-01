import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Free", "Pro", "Team"],
      unique: true,
    },

    price: {
      type: Number,
      required: true,
    },

    dailyLimit: {
      type: Number,
      required: true,
    },

    monthlyLimit: {
      type: Number,
      required: true,
    },

    supportedFeatures: {
      type: [String],
      default: [],
    },

    maxUploadSize: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;