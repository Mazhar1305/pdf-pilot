import Plan from "../models/Plan.js";

export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });

    return res.status(200).json({
      status: "success",
      count: plans.length,
      plans
    });
  } catch (error) {
    console.error("getPlans error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error while fetching plans."
    });
  }
};