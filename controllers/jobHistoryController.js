import Job from "../models/Job.js";

export const getJobHistory = async (req, res) => {
  try {
    

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const jobs = await Job.find({
      user: req.user._id
    });

    

    const totalJobs = jobs.length;

    const history = jobs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit)
      .map(job => ({
        jobId: job._id,
        tool: job.tool,
        status: job.status,
        fileName: job.outputFile || null,
        createdTime: job.createdAt
      }));

    return res.status(200).json({
      page,
      limit,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      jobs: history
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};