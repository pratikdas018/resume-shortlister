import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  matchedSkills: { type: [String], default: [] },
  missingSkills: { type: [String], default: [] },
  keywordMatches: { type: [String], default: [] },
  score: { type: Number, default: 0 },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  yearsExperience: { type: Number, default: 0 },
  experienceConfidence: {
    type: String,
    enum: ["high", "medium", "low"],
    default: "low"
  },
  experienceSource: {
    type: String,
    enum: ["gemini", "heuristic"],
    default: "heuristic"
  },
  experienceEvidence: { type: String, default: "" },
  educationLevel: { type: String, default: "Unknown" },
  status: {
    type: String,
    enum: ["New", "Screening", "Interview", "Shortlisted", "Rejected"],
    default: "New"
  },
  notes: { type: String, default: "" },
  candidateSummary: { type: String, default: "" },
  interviewQuestions: { type: [String], default: [] },
  insightsUpdatedAt: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Resume", ResumeSchema);
