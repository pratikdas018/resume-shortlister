import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema({
  filename: String,
  text: String,
  matchedSkills: [String],
  missingSkills: [String],
  skills: [String],
  score: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Resume", ResumeSchema);
