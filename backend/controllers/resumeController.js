import Resume from "../models/Resume.js";
import { parsePDF } from "../utils/pdfParser.js";
import { analyzeResume } from "../utils/skillAnalyzer.js";

export const uploadAndAnalyze = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ error: "Job description is required" });
    }

    // ✅ multer with upload.array always gives req.files
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    const results = [];

    for (const file of files) {
      const text = await parsePDF(file.path);

      const { score, matchedSkills, missingSkills } =
        analyzeResume(text, jobDescription);

      const resume = await Resume.create({
        filename: file.originalname,
        score,
        matchedSkills,
        missingSkills
      });

      results.push(resume);
    }

    res.status(200).json(results);

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ error: "Resume analysis failed" });
  }
};

export const getResults = async (req, res) => {
  const results = await Resume.find().sort({ createdAt: -1 });
  res.json(results);
};
