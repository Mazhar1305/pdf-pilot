import express from "express";
import { getPlans } from "../controllers/plansController.js";

const router = express.Router();

router.get("/", getPlans);

export default router;