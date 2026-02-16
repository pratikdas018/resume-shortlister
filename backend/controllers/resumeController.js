import fs from "fs";
import Resume from "../models/Resume.js";
import { parsePDF } from "../utils/pdfParser.js";
import {
  analyzeResume,
  extractYearsExperienceHeuristic
} from "../utils/skillAnalyzer.js";
import {
  generateCandidateSummaryWithGemini,
  generateInterviewQuestionsWithGemini,
  detectExperienceFromResumeWithGemini
} from "../utils/geminiClient.js";
import { sendStatusEmailWithBrevo } from "../utils/emailService.js";

const ATS_STATUSES = ["New", "Screening", "Interview", "Shortlisted", "Rejected"];

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  scoreHigh: { score: -1, createdAt: -1 },
  scoreLow: { score: 1, createdAt: -1 },
  experienceHigh: { yearsExperience: -1, score: -1 }
};

const scoreRecommendation = (score) => {
  if (score >= 80) {
    return "Strong fit. Move to interview panel.";
  }
  if (score >= 60) {
    return "Promising profile. Do recruiter screening call.";
  }
  if (score >= 40) {
    return "Partial fit. Evaluate domain depth before shortlisting.";
  }
  return "Low fit for this role. Keep in backup pool.";
};

const buildCandidateSummary = (candidate) => {
  const topSkills = candidate.matchedSkills?.slice(0, 5) || [];
  const missingSkills = candidate.missingSkills?.slice(0, 4) || [];
  const keywordHits = candidate.keywordMatches?.slice(0, 6) || [];
  const experience = candidate.yearsExperience || 0;
  const education = candidate.educationLevel || "Unknown";
  const strengthsLine = topSkills.length > 0
    ? `Strengths: ${topSkills.join(", ")}.`
    : "Strengths: Profile has limited direct skill overlap.";
  const gapLine = missingSkills.length > 0
    ? `Gaps to validate: ${missingSkills.join(", ")}.`
    : "Gaps to validate: No critical gaps detected from current JD keywords.";
  const keywordLine = keywordHits.length > 0
    ? `Additional keyword evidence: ${keywordHits.join(", ")}.`
    : "Additional keyword evidence: Not enough JD-specific keyword matches captured.";

  return [
    `ATS score is ${candidate.score}% with ${experience} year(s) of experience and ${education} education level.`,
    strengthsLine,
    gapLine,
    keywordLine,
    `Recommendation: ${scoreRecommendation(candidate.score || 0)}`
  ].join(" ");
};

const buildInterviewQuestions = (candidate) => {
  const matchedSkills = candidate.matchedSkills?.slice(0, 3) || [];
  const missingSkills = candidate.missingSkills?.slice(0, 3) || [];
  const keywordFocus = candidate.keywordMatches?.slice(0, 3) || [];
  const experienceYears = candidate.yearsExperience || 0;

  const questions = [];

  if (matchedSkills.length > 0) {
    questions.push(
      `Describe a recent project where you used ${matchedSkills.join(", ")} and explain your direct contribution.`
    );
  } else {
    questions.push(
      "Walk us through your most relevant project and explain how it aligns with this role."
    );
  }

  if (experienceYears > 0) {
    questions.push(
      `You mention ${experienceYears} year(s) of experience. What were your key outcomes in the last role?`
    );
  } else {
    questions.push(
      "Share your practical experience for this role, including internships, projects, or freelance work."
    );
  }

  for (const skill of missingSkills) {
    questions.push(
      `Your resume shows limited evidence for ${skill}. What is your current proficiency and ramp-up plan?`
    );
  }

  if (keywordFocus.length > 0) {
    questions.push(
      `How have you applied ${keywordFocus.join(", ")} in a production or real-world environment?`
    );
  }

  questions.push(
    "How do you prioritize tasks when handling multiple deadlines with engineering and business stakeholders?"
  );

  return [...new Set(questions)].slice(0, 7);
};

const defaultExperienceEvidence = (yearsExperience) => {
  if (yearsExperience > 0) {
    return "Extracted from explicit year mentions in resume text.";
  }
  return "No clear year-based experience pattern found in resume text.";
};

export const uploadAndAnalyze = async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const files = req.files;

    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ error: "Job description is required" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const text = await parsePDF(file.path);
        const analysis = analyzeResume(text, jobDescription);
        const heuristicYearsExperience = extractYearsExperienceHeuristic(text.toLowerCase());

        let yearsExperience = analysis.yearsExperience;
        let experienceConfidence = yearsExperience > 0 ? "medium" : "low";
        let experienceSource = "heuristic";
        let experienceEvidence = defaultExperienceEvidence(heuristicYearsExperience);

        try {
          const aiExperience = await detectExperienceFromResumeWithGemini(text);
          if (aiExperience) {
            yearsExperience = aiExperience.yearsExperience;
            experienceConfidence = aiExperience.confidence;
            experienceSource = "gemini";
            experienceEvidence = aiExperience.evidence || "Estimated from AI resume parsing.";
          }
        } catch (error) {
          console.error("EXPERIENCE AI PARSING ERROR:", error);
        }

        const resume = await Resume.create({
          filename: file.originalname,
          score: analysis.score,
          matchedSkills: analysis.matchedSkills,
          missingSkills: analysis.missingSkills,
          keywordMatches: analysis.keywordMatches,
          email: analysis.email,
          phone: analysis.phone,
          yearsExperience,
          experienceConfidence,
          experienceSource,
          experienceEvidence,
          educationLevel: analysis.educationLevel
        });

        results.push(resume);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          message: "Failed to parse or analyze this resume"
        });
      } finally {
        fs.promises.unlink(file.path).catch(() => {});
      }
    }

    if (results.length === 0) {
      return res.status(400).json({
        error: "No resumes could be analyzed",
        errors
      });
    }

    results.sort((left, right) => right.score - left.score);

    return res.status(errors.length > 0 ? 207 : 200).json({
      results,
      errors,
      meta: {
        processed: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ error: "Resume analysis failed" });
  }
};

export const getResults = async (req, res) => {
  try {
    const {
      search = "",
      status = "All",
      minScore = "0",
      sortBy = "scoreHigh"
    } = req.query;

    const filters = {};

    if (status !== "All" && ATS_STATUSES.includes(status)) {
      filters.status = status;
    }

    const scoreValue = Number.parseInt(minScore, 10);
    if (Number.isFinite(scoreValue)) {
      filters.score = { $gte: Math.max(0, Math.min(scoreValue, 100)) };
    }

    const searchTerm = search.trim();
    if (searchTerm.length > 0) {
      const searchRegex = new RegExp(searchTerm, "i");
      filters.$or = [
        { filename: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { matchedSkills: searchRegex },
        { keywordMatches: searchRegex }
      ];
    }

    const sortOption = SORT_OPTIONS[sortBy] || SORT_OPTIONS.scoreHigh;
    const results = await Resume.find(filters).sort(sortOption).limit(250);

    return res.json(results);
  } catch (error) {
    console.error("FETCH RESULTS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch results" });
  }
};

export const getSummary = async (_req, res) => {
  try {
    const candidates = await Resume.find({}, "score status");
    const totalCandidates = candidates.length;

    const statusCounts = ATS_STATUSES.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {});

    let totalScore = 0;
    for (const candidate of candidates) {
      totalScore += candidate.score || 0;
      if (statusCounts[candidate.status] !== undefined) {
        statusCounts[candidate.status] += 1;
      }
    }

    const avgScore = totalCandidates > 0
      ? Math.round((totalScore / totalCandidates) * 10) / 10
      : 0;

    return res.json({
      totalCandidates,
      avgScore,
      shortlisted: statusCounts.Shortlisted,
      interviews: statusCounts.Interview,
      statusCounts
    });
  } catch (error) {
    console.error("SUMMARY ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
};

export const getAdminOverview = async (_req, res) => {
  try {
    const candidates = await Resume.find({}).sort({ createdAt: -1 }).limit(1000);

    const statusCounts = ATS_STATUSES.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {});

    const matchedSkillCounts = {};
    const missingSkillCounts = {};
    const educationCounts = {};
    const experienceBands = {
      "0-1": 0,
      "2-4": 0,
      "5+": 0
    };

    let totalScore = 0;
    let withEmail = 0;
    let aiExperienceDetected = 0;

    for (const candidate of candidates) {
      const score = candidate.score || 0;
      totalScore += score;

      if (statusCounts[candidate.status] !== undefined) {
        statusCounts[candidate.status] += 1;
      }

      if (candidate.email) {
        withEmail += 1;
      }

      if (candidate.experienceSource === "gemini") {
        aiExperienceDetected += 1;
      }

      const years = candidate.yearsExperience || 0;
      if (years <= 1) {
        experienceBands["0-1"] += 1;
      } else if (years <= 4) {
        experienceBands["2-4"] += 1;
      } else {
        experienceBands["5+"] += 1;
      }

      const educationLevel = candidate.educationLevel || "Unknown";
      educationCounts[educationLevel] = (educationCounts[educationLevel] || 0) + 1;

      for (const skill of candidate.matchedSkills || []) {
        matchedSkillCounts[skill] = (matchedSkillCounts[skill] || 0) + 1;
      }
      for (const skill of candidate.missingSkills || []) {
        missingSkillCounts[skill] = (missingSkillCounts[skill] || 0) + 1;
      }
    }

    const totalCandidates = candidates.length;
    const avgScore = totalCandidates > 0
      ? Math.round((totalScore / totalCandidates) * 10) / 10
      : 0;

    const highFit = candidates.filter((candidate) => (candidate.score || 0) >= 80).length;
    const mediumFit = candidates.filter((candidate) => (candidate.score || 0) >= 60 && (candidate.score || 0) < 80).length;
    const lowFit = candidates.filter((candidate) => (candidate.score || 0) < 60).length;

    const topMatchedSkills = Object.entries(matchedSkillCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    const topMissingSkills = Object.entries(missingSkillCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    const educationDistribution = Object.entries(educationCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([level, count]) => ({ level, count }));

    const recentCandidates = candidates.slice(0, 10).map((candidate) => ({
      _id: candidate._id,
      filename: candidate.filename,
      status: candidate.status,
      score: candidate.score,
      yearsExperience: candidate.yearsExperience,
      createdAt: candidate.createdAt
    }));

    return res.json({
      generatedAt: new Date(),
      totals: {
        totalCandidates,
        avgScore,
        highFit,
        mediumFit,
        lowFit,
        withEmail,
        aiExperienceDetected
      },
      statusCounts,
      experienceBands,
      educationDistribution,
      topMatchedSkills,
      topMissingSkills,
      recentCandidates
    });
  } catch (error) {
    console.error("ADMIN OVERVIEW ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch admin overview" });
  }
};

export const generateCandidateSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const jobDescription = typeof req.body?.jobDescription === "string"
      ? req.body.jobDescription.trim()
      : "";
    const candidate = await Resume.findById(id);

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    let candidateSummary = "";
    try {
      candidateSummary = await generateCandidateSummaryWithGemini(candidate, jobDescription);
    } catch (error) {
      console.error("GEMINI SUMMARY ERROR:", error);
    }

    if (!candidateSummary) {
      candidateSummary = buildCandidateSummary(candidate);
    }

    candidate.candidateSummary = candidateSummary;
    candidate.insightsUpdatedAt = new Date();
    await candidate.save();

    return res.json({
      candidateId: candidate._id,
      candidateSummary
    });
  } catch (error) {
    console.error("GENERATE SUMMARY ERROR:", error);
    return res.status(500).json({ error: "Failed to generate candidate summary" });
  }
};

export const generateInterviewQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const jobDescription = typeof req.body?.jobDescription === "string"
      ? req.body.jobDescription.trim()
      : "";
    const candidate = await Resume.findById(id);

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    let interviewQuestions = [];
    try {
      interviewQuestions = await generateInterviewQuestionsWithGemini(candidate, jobDescription);
    } catch (error) {
      console.error("GEMINI QUESTIONS ERROR:", error);
    }

    if (!Array.isArray(interviewQuestions) || interviewQuestions.length === 0) {
      interviewQuestions = buildInterviewQuestions(candidate);
    }

    candidate.interviewQuestions = interviewQuestions;
    candidate.insightsUpdatedAt = new Date();
    await candidate.save();

    return res.json({
      candidateId: candidate._id,
      interviewQuestions
    });
  } catch (error) {
    console.error("GENERATE QUESTIONS ERROR:", error);
    return res.status(500).json({ error: "Failed to generate interview questions" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ATS_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const existingCandidate = await Resume.findById(id);

    if (!existingCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const previousStatus = existingCandidate.status;
    existingCandidate.status = status;
    const updated = await existingCandidate.save();

    let emailNotification = {
      attempted: false,
      sent: false,
      reason: "Notification not triggered."
    };

    const shouldNotify = ["Shortlisted", "Rejected"].includes(status)
      && previousStatus !== status;

    if (shouldNotify) {
      try {
        emailNotification = await sendStatusEmailWithBrevo({
          candidate: updated,
          status
        });
      } catch (error) {
        emailNotification = {
          attempted: true,
          sent: false,
          reason: error.message || "Failed to send email notification."
        };
      }
    }

    return res.json({
      candidate: updated,
      emailNotification
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    return res.status(500).json({ error: "Failed to update status" });
  }
};

export const updateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const notes = typeof req.body.notes === "string"
      ? req.body.notes.trim()
      : "";

    const updated = await Resume.findByIdAndUpdate(
      id,
      { notes },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("UPDATE NOTES ERROR:", error);
    return res.status(500).json({ error: "Failed to update notes" });
  }
};
