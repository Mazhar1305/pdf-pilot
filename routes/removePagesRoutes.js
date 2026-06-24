import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { removePages } from "../controllers/removePagesController.js";

const router = express.Router();

router.post("/remove-pages", upload.single("pdf"), removePages);

export default router;
