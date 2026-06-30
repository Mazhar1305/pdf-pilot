import express from "express";
import { downloadFile } from "../controllers/downloadController.js";

const router = express.Router();

router.get("/:id/download", downloadFile);

export default router;
