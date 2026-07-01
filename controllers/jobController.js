import mongoose from "mongoose";
import Job from "../models/Job.js";

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid job ID"
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    return res.status(200).json({
      jobId: job._id,
      tool: job.tool,
      status: job.status,
      createdTime: job.createdAt,
      completedTime:
        job.status === "done" || job.status === "error"
          ? job.updatedAt
          : null,
      resultUrl: job.outputFile
        ? `/uploads/${job.outputFile}`
        : null
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};