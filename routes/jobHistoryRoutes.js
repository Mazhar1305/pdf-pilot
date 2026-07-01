import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { getJobHistory } from "../controllers/jobHistoryController.js";

const router = express.Router();

router.get(
  "/jobs",
  protect,
  getJobHistory
);

export default router;