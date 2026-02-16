import express from "express";
import multer from "multer";
import { requireRole } from "../middleware/authMiddleware.js";
import {
  uploadAndAnalyze,
  getResults,
  getSummary,
  getAdminOverview,
  generateCandidateSummary,
  generateInterviewQuestions,
  updateStatus,
  updateNotes
} from "../controllers/resumeController.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20
  },
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf) {
      return callback(new Error("Only PDF resumes are allowed"));
    }
    return callback(null, true);
  }
});

router.post("/upload", upload.array("resumes", 20), uploadAndAnalyze);
router.get("/results", getResults);
router.get("/summary", getSummary);
router.get("/admin/overview", requireRole("admin"), getAdminOverview);
router.post("/:id/generate-summary", generateCandidateSummary);
router.post("/:id/generate-interview-questions", generateInterviewQuestions);
router.patch("/:id/status", updateStatus);
router.patch("/:id/notes", updateNotes);

export default router;
