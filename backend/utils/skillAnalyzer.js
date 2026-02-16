const SKILLS = [
  "react", "node", "node.js", "express", "mongodb",
  "javascript", "jwt", "html", "css", "redux",
  "java", "spring", "spring boot", "springboot",
  "hibernate", "mysql", "microservices", "rest",
  "python", "django", "flask", "fastapi",
  "sqlalchemy", "pandas", "numpy",
  "machine learning", "deep learning",
  "tensorflow", "keras", "pytorch",
  "scikit-learn", "nlp", "computer vision",
  "data science", "data analysis",
  "matplotlib", "seaborn", "statistics", "jupyter",
  "android", "android studio", "kotlin",
  "java android", "firebase", "xml",
  "sql", "postgresql", "git", "github", "docker", "aws",
  "excel", "power bi"
];

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "this", "that", "have", "has", "will",
  "you", "your", "our", "their", "about", "into", "must", "years", "year", "role",
  "developer", "engineer", "experience", "looking", "candidate", "required", "plus",
  "strong", "skills", "knowledge", "apis", "api", "using", "build", "building",
  "work", "team", "ability", "good", "excellent", "or", "to", "of", "in", "on"
]);

const EDUCATION_PATTERNS = [
  { label: "PhD", regex: /\b(phd|doctorate)\b/i },
  { label: "Masters", regex: /\b(master'?s|m\.?s\.?|mtech|mba)\b/i },
  { label: "Bachelors", regex: /\b(bachelor'?s|b\.?tech|b\.?e\.?|bsc|bca)\b/i },
  { label: "Diploma", regex: /\b(diploma|associate)\b/i }
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasPhrase = (text, phrase) => {
  const escaped = escapeRegExp(phrase).replace(/\s+/g, "\\s+");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
};

const extractRequiredSkills = (jobDescription) => {
  const required = SKILLS.filter((skill) => hasPhrase(jobDescription, skill));
  return [...new Set(required)];
};

const extractEmail = (resumeText) => {
  const match = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : "";
};

const extractPhone = (resumeText) => {
  const match = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}/);
  return match ? match[0].trim() : "";
};

export const extractYearsExperienceHeuristic = (text) => {
  const matches = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi);
  if (!matches || matches.length === 0) {
    return 0;
  }

  const parsedYears = matches
    .map((chunk) => Number.parseInt(chunk, 10))
    .filter((yearValue) => Number.isFinite(yearValue) && yearValue >= 0 && yearValue <= 50);

  if (parsedYears.length === 0) {
    return 0;
  }

  return Math.max(...parsedYears);
};

const extractEducationLevel = (resumeText) => {
  for (const pattern of EDUCATION_PATTERNS) {
    if (pattern.regex.test(resumeText)) {
      return pattern.label;
    }
  }
  return "Unknown";
};

const extractKeywordPool = (jobDescription) => {
  const words = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return [...new Set(words)];
};

const extractKeywordMatches = (resumeText, keywordPool) => {
  return keywordPool.filter((keyword) => hasPhrase(resumeText, keyword)).slice(0, 20);
};

export const analyzeResume = (resumeText, jobDescription) => {
  const resume = resumeText.toLowerCase();
  const jd = jobDescription.toLowerCase();

  const requiredSkills = extractRequiredSkills(jd);
  const matchedSkills = requiredSkills.filter((skill) => hasPhrase(resume, skill));
  const missingSkills = requiredSkills.filter((skill) => !hasPhrase(resume, skill));

  const keywordPool = extractKeywordPool(jd);
  const keywordMatches = extractKeywordMatches(resume, keywordPool);

  const requiredExperienceYears = extractYearsExperienceHeuristic(jd);
  const yearsExperience = extractYearsExperienceHeuristic(resume);

  const skillScore = requiredSkills.length > 0
    ? (matchedSkills.length / requiredSkills.length) * 70
    : 0;

  const keywordScore = keywordPool.length > 0
    ? (keywordMatches.length / keywordPool.length) * 20
    : 0;

  let experienceScore = 0;
  if (requiredExperienceYears > 0) {
    experienceScore = Math.min(yearsExperience / requiredExperienceYears, 1) * 10;
  } else if (yearsExperience > 0) {
    experienceScore = 8;
  }

  const score = Math.round(Math.min(skillScore + keywordScore + experienceScore, 100));

  return {
    score,
    matchedSkills,
    missingSkills,
    keywordMatches,
    email: extractEmail(resumeText),
    phone: extractPhone(resumeText),
    yearsExperience,
    educationLevel: extractEducationLevel(resumeText)
  };
};
