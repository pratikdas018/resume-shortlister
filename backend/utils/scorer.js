export const scoreResume = (resumeText, jobDescription) => {
  const resume = resumeText.toLowerCase();
  const jdWords = jobDescription
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2); // ignore small words

  if (jdWords.length === 0) return 0;

  let matchCount = 0;

  jdWords.forEach(word => {
    if (resume.includes(word)) {
      matchCount++;
    }
  });

  const score = Math.round((matchCount / jdWords.length) * 100);
  return score;
};
