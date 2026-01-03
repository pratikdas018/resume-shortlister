const SKILLS = [
  // 🔹 MERN / Web
  "react", "node", "node.js", "express", "mongodb",
  "javascript", "jwt", "html", "css", "redux",

  // 🔹 Java Backend
  "java", "spring", "spring boot", "springboot",
  "hibernate", "mysql", "microservices", "rest",

  // 🔹 Python Developer
  "python", "django", "flask", "fastapi",
  "sqlalchemy", "pandas", "numpy",

  // 🔹 AI / ML
  "machine learning", "deep learning",
  "tensorflow", "keras", "pytorch",
  "scikit-learn", "nlp", "computer vision",

  // 🔹 Data Science
  "data science", "data analysis",
  "pandas", "numpy", "matplotlib",
  "seaborn", "statistics", "jupyter",

  // 🔹 Android
  "android", "android studio", "kotlin",
  "java android", "firebase", "xml",

  // 🔹 Databases / Tools
  "sql", "postgresql", "mongodb",
  "git", "github", "docker", "aws"
];

export const analyzeResume = (resumeText, jobDescription) => {
  const resume = resumeText.toLowerCase();
  const jd = jobDescription.toLowerCase();

  // 🔹 extract skills required for the selected role
  const requiredSkills = SKILLS.filter(skill => jd.includes(skill));

  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach(skill => {
    if (resume.includes(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  // 🔹 SAFE score calculation
  let score = 0;
  if (requiredSkills.length > 0) {
    score = Math.round(
      (matchedSkills.length / requiredSkills.length) * 100
    );
  }

  return {
    score,
    matchedSkills,
    missingSkills
  };
};
