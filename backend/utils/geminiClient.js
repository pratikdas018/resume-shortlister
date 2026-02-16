const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const extractTextFromGeminiResponse = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const safeJsonParse = (rawText) => {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
};

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 20000);

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        }),
        signal: abortController.signal
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    return extractTextFromGeminiResponse(payload);
  } finally {
    clearTimeout(timeoutId);
  }
};

const candidateContextBlock = (candidate, jobDescription = "") => {
  const lines = [
    `Candidate filename: ${candidate.filename || "N/A"}`,
    `ATS score: ${candidate.score ?? 0}%`,
    `Matched skills: ${(candidate.matchedSkills || []).join(", ") || "None"}`,
    `Missing skills: ${(candidate.missingSkills || []).join(", ") || "None"}`,
    `Keyword matches: ${(candidate.keywordMatches || []).join(", ") || "None"}`,
    `Years of experience: ${candidate.yearsExperience ?? 0}`,
    `Education level: ${candidate.educationLevel || "Unknown"}`,
    `Current ATS status: ${candidate.status || "New"}`,
    `Recruiter notes: ${candidate.notes || "None"}`
  ];

  if (jobDescription && jobDescription.trim().length > 0) {
    lines.push(`Job description context: ${jobDescription.trim()}`);
  }

  return lines.join("\n");
};

export const generateCandidateSummaryWithGemini = async (candidate, jobDescription = "") => {
  const prompt = `
You are an ATS copilot for recruiters.
Create a concise candidate summary in professional recruiter language.

Return strict JSON only:
{
  "candidateSummary": "..."
}

Rules:
- 70 to 120 words.
- Mention fit level, key strengths, likely skill gaps, and recommendation.
- Do not use markdown.

Candidate data:
${candidateContextBlock(candidate, jobDescription)}
`;

  const raw = await callGemini(prompt);
  const parsed = safeJsonParse(raw);
  const summary = parsed?.candidateSummary;
  return typeof summary === "string" ? summary.trim() : "";
};

export const generateInterviewQuestionsWithGemini = async (candidate, jobDescription = "") => {
  const prompt = `
You are an ATS copilot helping recruiters run structured interviews.
Generate focused interview questions from candidate profile and job context.

Return strict JSON only:
{
  "interviewQuestions": ["q1", "q2", "q3", "q4", "q5", "q6"]
}

Rules:
- Return 5 to 7 questions.
- Questions must test depth, not generic soft skills only.
- Include at least one question for each major gap if present.
- Keep each question under 30 words.
- Do not use markdown.

Candidate data:
${candidateContextBlock(candidate, jobDescription)}
`;

  const raw = await callGemini(prompt);
  const parsed = safeJsonParse(raw);
  const questions = parsed?.interviewQuestions;
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 7);
};

const normalizeConfidence = (value) => {
  const normalized = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

export const detectExperienceFromResumeWithGemini = async (resumeText) => {
  if (!resumeText || resumeText.trim().length === 0) {
    return null;
  }

  const prompt = `
You are an ATS parsing engine.
Estimate professional years of experience from resume text.

Return strict JSON only:
{
  "yearsExperience": 0,
  "confidence": "high|medium|low",
  "evidence": "short explanation"
}

Rules:
- yearsExperience must be a number from 0 to 50.
- Prefer full-time professional experience; include internships only if clearly substantial.
- If unclear, provide best estimate with lower confidence.
- Keep evidence under 25 words.
- Do not use markdown.

Resume text:
${resumeText.slice(0, 16000)}
`;

  const raw = await callGemini(prompt);
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const yearsExperienceRaw = Number(parsed.yearsExperience);
  if (!Number.isFinite(yearsExperienceRaw)) {
    return null;
  }

  const yearsExperience = Math.max(0, Math.min(Math.round(yearsExperienceRaw), 50));
  const confidence = normalizeConfidence(parsed.confidence);
  const evidence = typeof parsed.evidence === "string"
    ? parsed.evidence.trim().slice(0, 200)
    : "";

  return {
    yearsExperience,
    confidence,
    evidence
  };
};
