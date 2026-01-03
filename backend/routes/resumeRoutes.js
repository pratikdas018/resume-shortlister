import express from "express";
import multer from "multer";
import {
  uploadAndAnalyze,
  getResults
} from "../controllers/resumeController.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// ✅ MULTIPLE RESUME UPLOAD (HR STYLE)
router.post(
  "/upload",
  upload.array("resumes", 20),
  uploadAndAnalyze
);

router.get("/results", getResults);

export default router;
