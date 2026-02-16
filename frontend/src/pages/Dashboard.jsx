import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api";

const MotionArticle = motion.article;
const STATUS_OPTIONS = ["New", "Screening", "Interview", "Shortlisted", "Rejected"];

const ROLE_TEMPLATES = {
  MERN: `Hiring for Full Stack (MERN) role. Required skills: React, Node.js, Express, MongoDB, REST APIs, JWT, Git, Docker. Minimum 2 years experience preferred.`,
  JAVA: `Hiring Java Backend Engineer. Required skills: Java, Spring Boot, Hibernate, MySQL, Microservices, REST APIs. Minimum 3 years experience.`,
  PYTHON: `Hiring Python Backend Developer. Required skills: Python, Django or Flask, SQL, API design, testing, deployment. Minimum 2 years experience.`,
  AIML: `Hiring AI/ML Engineer. Required skills: Python, Machine Learning, Deep Learning, NLP, TensorFlow or PyTorch, model deployment. Minimum 2 years experience.`,
  DATASCIENCE: `Hiring Data Scientist. Required skills: Python, Pandas, NumPy, statistics, machine learning, SQL, data storytelling. Minimum 2 years experience.`,
  DATAANALYST: `Hiring Data Analyst. Required skills: SQL, Python, Pandas, Excel, Power BI, dashboarding and reporting. Minimum 1 year experience.`,
  ANDROID: `Hiring Android Developer. Required skills: Kotlin, Android Studio, Java, Firebase, REST APIs, clean architecture. Minimum 2 years experience.`
};

const SORT_OPTIONS = [
  { value: "scoreHigh", label: "Highest Score" },
  { value: "scoreLow", label: "Lowest Score" },
  { value: "experienceHigh", label: "Most Experience" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" }
];

const emptySummary = {
  totalCandidates: 0,
  avgScore: 0,
  shortlisted: 0,
  interviews: 0,
  statusCounts: {
    New: 0,
    Screening: 0,
    Interview: 0,
    Shortlisted: 0,
    Rejected: 0
  }
};

const statusClassMap = {
  New: "bg-slate-100 text-slate-700",
  Screening: "bg-cyan-100 text-cyan-700",
  Interview: "bg-amber-100 text-amber-700",
  Shortlisted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700"
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

const truncate = (value, max = 180) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
};

export default function Dashboard({ theme = "light", onToggleTheme = () => {} }) {
  const uploadInputRef = useRef(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [notesDraft, setNotesDraft] = useState({});
  const [insightsByCandidate, setInsightsByCandidate] = useState({});
  const [summaryLoadingByCandidate, setSummaryLoadingByCandidate] = useState({});
  const [questionsLoadingByCandidate, setQuestionsLoadingByCandidate] = useState({});
  const [activeCandidateId, setActiveCandidateId] = useState(null);
  const [comparisonSelection, setComparisonSelection] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    minScore: 0,
    sortBy: "scoreHigh"
  });

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get("/resumes/summary");
      setSummary({ ...emptySummary, ...response.data });
    } catch (error) {
      console.error("Failed to fetch ATS summary", error);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const response = await api.get("/resumes/results", { params: filters });
      setResults(response.data);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
      setNotice({ type: "error", message: "Could not load candidates." });
    } finally {
      setLoadingResults(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchResults, 250);
    return () => window.clearTimeout(timeoutId);
  }, [fetchResults]);

  const activeCandidate = useMemo(
    () => results.find((candidate) => candidate._id === activeCandidateId) || null,
    [activeCandidateId, results]
  );

  const comparedCandidates = useMemo(
    () => comparisonSelection
      .map((candidateId) => results.find((candidate) => candidate._id === candidateId))
      .filter(Boolean),
    [comparisonSelection, results]
  );

  const pipelineColumns = useMemo(
    () => STATUS_OPTIONS.map((status) => ({
      status,
      candidates: results
        .filter((candidate) => candidate.status === status)
        .sort((left, right) => (right.score || 0) - (left.score || 0))
    })),
    [results]
  );

  const scoreBands = useMemo(() => {
    const config = [
      { label: "80+", className: "bg-emerald-500", match: (s) => s >= 80 },
      { label: "60-79", className: "bg-cyan-500", match: (s) => s >= 60 && s < 80 },
      { label: "40-59", className: "bg-amber-500", match: (s) => s >= 40 && s < 60 },
      { label: "<40", className: "bg-rose-500", match: (s) => s < 40 }
    ];
    return config.map((band) => {
      const count = results.filter((candidate) => band.match(candidate.score || 0)).length;
      const percentage = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
      return { ...band, count, percentage };
    });
  }, [results]);

  const getSummaryText = (candidate) => {
    const generated = insightsByCandidate[candidate._id]?.candidateSummary;
    return generated ?? candidate.candidateSummary ?? "";
  };

  const getQuestionList = (candidate) => {
    const generated = insightsByCandidate[candidate._id]?.interviewQuestions;
    return generated ?? candidate.interviewQuestions ?? [];
  };

  useEffect(() => {
    setComparisonSelection((previous) =>
      previous.filter((candidateId) => results.some((candidate) => candidate._id === candidateId))
    );
  }, [results]);

  const refreshAll = async () => {
    await Promise.all([fetchResults(), fetchSummary()]);
    setNotice({ type: "success", message: "Dashboard refreshed." });
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "All", minScore: 0, sortBy: "scoreHigh" });
    setNotice({ type: "success", message: "Filters reset." });
  };

  const exportShortlistedCsv = () => {
    const shortlisted = results.filter((candidate) => candidate.status === "Shortlisted");
    if (shortlisted.length === 0) {
      setNotice({ type: "warn", message: "No shortlisted candidates to export." });
      return;
    }
    const headers = ["Filename", "Email", "Phone", "Score", "YearsExperience", "Status"];
    const rows = shortlisted.map((candidate) => [
      candidate.filename,
      candidate.email,
      candidate.phone,
      candidate.score,
      candidate.yearsExperience,
      candidate.status
    ]);
    const csvContent = [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shortlisted_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice({ type: "success", message: "Shortlisted CSV exported." });
  };

  const handleRoleChange = (event) => {
    const role = event.target.value;
    setSelectedRole(role);
    setJobDescription(ROLE_TEMPLATES[role] || "");
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || jobDescription.trim().length === 0) {
      setNotice({ type: "error", message: "Add job description and at least one PDF resume." });
      return;
    }
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("resumes", file));
    formData.append("jobDescription", jobDescription);
    setUploading(true);
    setNotice({ type: "", message: "" });
    try {
      const response = await api.post("/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const payload = response.data || {};
      const processed = payload.meta?.processed ?? payload.results?.length ?? 0;
      const failed = payload.meta?.failed ?? payload.errors?.length ?? 0;
      setNotice({
        type: failed > 0 ? "warn" : "success",
        message: `Processed ${processed} resume(s)${failed > 0 ? `, ${failed} failed` : ""}.`
      });
      setSelectedFiles([]);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      await Promise.all([fetchResults(), fetchSummary()]);
    } catch (error) {
      console.error("Upload failed", error);
      setNotice({ type: "error", message: "Resume upload failed. Ensure files are PDFs under 5MB." });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (candidateId, nextStatus) => {
    const previous = results;
    setResults((current) => current.map((candidate) => (
      candidate._id === candidateId ? { ...candidate, status: nextStatus } : candidate
    )));
    try {
      const response = await api.patch(`/resumes/${candidateId}/status`, { status: nextStatus });
      const payload = response.data || {};
      const updatedCandidate = payload.candidate || payload;
      const emailNotification = payload.emailNotification;
      setResults((current) => current.map((candidate) => (
        candidate._id === candidateId ? { ...candidate, ...updatedCandidate } : candidate
      )));
      if (emailNotification?.attempted && !emailNotification.sent) {
        setNotice({
          type: "warn",
          message: `Status updated to ${nextStatus}, but email was not sent (${emailNotification.reason || "unknown reason"}).`
        });
      } else {
        setNotice({ type: "success", message: `Status updated to ${nextStatus}.` });
      }
      await fetchSummary();
    } catch (error) {
      console.error("Status update failed", error);
      setResults(previous);
      setNotice({ type: "error", message: "Failed to update candidate status." });
    }
  };

  const handleSaveNotes = async (candidateId) => {
    const noteValue = notesDraft[candidateId];
    if (typeof noteValue !== "string") return;
    try {
      const response = await api.patch(`/resumes/${candidateId}/notes`, { notes: noteValue });
      setResults((current) => current.map((candidate) => (
        candidate._id === candidateId ? { ...candidate, notes: response.data.notes } : candidate
      )));
      setNotice({ type: "success", message: "Notes saved." });
    } catch (error) {
      console.error("Notes update failed", error);
      setNotice({ type: "error", message: "Could not save notes." });
    }
  };

  const handleGenerateCandidateSummary = async (candidateId) => {
    setSummaryLoadingByCandidate((previous) => ({ ...previous, [candidateId]: true }));
    try {
      const response = await api.post(`/resumes/${candidateId}/generate-summary`, { jobDescription });
      setInsightsByCandidate((previous) => ({
        ...previous,
        [candidateId]: {
          ...previous[candidateId],
          candidateSummary: response.data.candidateSummary || ""
        }
      }));
      setNotice({ type: "success", message: "Candidate summary generated." });
    } catch (error) {
      console.error("Summary generation failed", error);
      setNotice({ type: "error", message: "Failed to generate candidate summary." });
    } finally {
      setSummaryLoadingByCandidate((previous) => ({ ...previous, [candidateId]: false }));
    }
  };

  const handleGenerateInterviewQuestions = async (candidateId) => {
    setQuestionsLoadingByCandidate((previous) => ({ ...previous, [candidateId]: true }));
    try {
      const response = await api.post(`/resumes/${candidateId}/generate-interview-questions`, { jobDescription });
      setInsightsByCandidate((previous) => ({
        ...previous,
        [candidateId]: {
          ...previous[candidateId],
          interviewQuestions: response.data.interviewQuestions || []
        }
      }));
      setNotice({ type: "success", message: "Interview questions generated." });
    } catch (error) {
      console.error("Interview question generation failed", error);
      setNotice({ type: "error", message: "Failed to generate interview questions." });
    } finally {
      setQuestionsLoadingByCandidate((previous) => ({ ...previous, [candidateId]: false }));
    }
  };

  const toggleCandidateComparison = (candidateId) => {
    setComparisonSelection((previous) => {
      if (previous.includes(candidateId)) {
        return previous.filter((id) => id !== candidateId);
      }
      if (previous.length >= 2) {
        setNotice({ type: "warn", message: "You can compare only 2 candidates at a time." });
        return previous;
      }
      return [...previous, candidateId];
    });
  };

  const openComparison = () => {
    if (comparisonSelection.length !== 2) {
      setNotice({ type: "warn", message: "Select exactly 2 candidates to compare." });
      return;
    }
    setActiveCandidateId(null);
    setIsComparisonOpen(true);
  };

  const clearComparisonSelection = () => {
    setComparisonSelection([]);
    setIsComparisonOpen(false);
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="glass-panel flex flex-col gap-4 rounded-3xl p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Talent Operations</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Recruiter ATS Workspace</h1>
              <p className="mt-2 text-sm text-slate-600">
                Source, score, and progress candidates through a realistic hiring pipeline.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
              {new Date().toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refreshAll} className="quick-action-btn rounded-xl px-4 py-2 text-sm">Refresh Data</button>
            <button onClick={exportShortlistedCsv} className="quick-action-btn rounded-xl px-4 py-2 text-sm">Export Shortlisted CSV</button>
            <button onClick={clearFilters} className="quick-action-btn rounded-xl px-4 py-2 text-sm">Clear Filters</button>
            <button
              onClick={onToggleTheme}
              className="quick-action-btn rounded-xl px-4 py-2 text-sm"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </header>

        {notice.message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : notice.type === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MotionArticle className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Total Candidates</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalCandidates}</p>
          </MotionArticle>
          <MotionArticle className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Average Match</p>
            <p className="mt-3 text-3xl font-bold">{summary.avgScore}%</p>
          </MotionArticle>
          <MotionArticle className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Interview Stage</p>
            <p className="mt-3 text-3xl font-bold">{summary.interviews}</p>
          </MotionArticle>
          <MotionArticle className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Shortlisted</p>
            <p className="mt-3 text-3xl font-bold">{summary.shortlisted}</p>
          </MotionArticle>
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="glass-panel space-y-4 rounded-3xl p-6 xl:col-span-7">
            <h2 className="text-2xl font-bold">Requisition Builder</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Role Template</span>
                <select value={selectedRole} onChange={handleRoleChange} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Select role profile</option>
                  <option value="MERN">MERN Developer</option>
                  <option value="JAVA">Java Engineer</option>
                  <option value="PYTHON">Python Backend</option>
                  <option value="AIML">AI / ML Engineer</option>
                  <option value="DATASCIENCE">Data Scientist</option>
                  <option value="DATAANALYST">Data Analyst</option>
                  <option value="ANDROID">Android Engineer</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Resume Upload</span>
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <textarea
              rows={5}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed"
              placeholder="Describe required skills, years of experience, and role outcomes."
            />

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
            >
              {uploading ? "Analyzing resumes..." : "Analyze Candidates"}
            </button>
          </section>

          <aside className="glass-panel space-y-4 rounded-3xl p-6 xl:col-span-5">
            <h2 className="text-2xl font-bold">Controls And Trends</h2>
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="name, email, phone, skill"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="All">All Stages</option>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select value={filters.sortBy} onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-sm font-semibold">Minimum Score: {filters.minScore}%</p>
              <input type="range" min="0" max="100" value={filters.minScore} onChange={(event) => setFilters((prev) => ({ ...prev, minScore: Number(event.target.value) }))} className="w-full accent-teal-700" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-sm font-semibold text-slate-700">Score Distribution</p>
              <div className="mt-3 space-y-2">
                {scoreBands.map((band) => (
                  <div key={band.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{band.label}</span>
                      <span>{band.count}</span>
                    </div>
                    <div className="heat-track">
                      <div className={`h-full rounded-full ${band.className}`} style={{ width: `${band.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Pipeline Board</h2>
            <span className="text-sm text-slate-500">{results.length} total profiles</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pipelineColumns.map((column) => (
              <div key={column.status} className="pipeline-column rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{column.status}</h3>
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-600">{column.candidates.length}</span>
                </div>
                <div className="space-y-2">
                  {column.candidates.slice(0, 4).map((candidate) => (
                    <button key={candidate._id} onClick={() => setActiveCandidateId(candidate._id)} className="pipeline-card w-full rounded-xl bg-white p-2 text-left text-xs shadow-sm">
                      <p className="truncate font-semibold text-slate-700">{candidate.filename}</p>
                      <p className="mt-1 text-slate-500">Score {candidate.score}%</p>
                    </button>
                  ))}
                  {column.candidates.length === 0 && <p className="text-xs text-slate-500">Empty stage</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Candidate Queue</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={openComparison}
                disabled={comparisonSelection.length !== 2}
                className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400"
              >
                Compare ({comparisonSelection.length}/2)
              </button>
              <button
                onClick={clearComparisonSelection}
                disabled={comparisonSelection.length === 0}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
              <span className="text-sm text-slate-500">{loadingResults ? "Refreshing..." : `${results.length} candidate(s)`}</span>
            </div>
          </div>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No candidates matched the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-3 py-2">Select</th>
                    <th className="px-3 py-2">Candidate</th>
                    <th className="px-3 py-2">Fit</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Insights</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((candidate) => (
                    <tr key={candidate._id} className="rounded-2xl bg-white shadow-sm">
                      <td className="rounded-l-2xl px-3 py-3 align-top">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={comparisonSelection.includes(candidate._id)}
                            onChange={() => toggleCandidateComparison(candidate._id)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
                          />
                          Compare
                        </label>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="max-w-56 truncate font-semibold text-slate-800">{candidate.filename}</p>
                        <p className="mt-1 text-xs text-slate-500">{candidate.email || "-"}</p>
                        <p className="text-xs text-slate-500">Added {formatDate(candidate.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="text-sm font-bold text-slate-800">{candidate.score}%</p>
                        <p className="mt-1 text-xs text-slate-500">Exp {candidate.yearsExperience || 0}y</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={`mb-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusClassMap[candidate.status] || "bg-slate-100 text-slate-700"}`}>{candidate.status}</span>
                        <select value={candidate.status} onChange={(event) => handleStatusChange(candidate._id, event.target.value)} className="block w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs">
                          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="w-72 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                          <p className="font-semibold text-slate-700">Summary</p>
                          <p className="mt-1 text-slate-600">{truncate(getSummaryText(candidate), 140) || "No summary yet."}</p>
                          <p className="mt-2 font-semibold text-slate-700">Questions: {getQuestionList(candidate).length}</p>
                        </div>
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <button onClick={() => setActiveCandidateId(candidate._id)} className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800">View Profile</button>
                          <button onClick={() => handleStatusChange(candidate._id, "Shortlisted")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Shortlist</button>
                          <button onClick={() => handleStatusChange(candidate._id, "Rejected")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Reject</button>
                          <button onClick={() => handleGenerateCandidateSummary(candidate._id)} disabled={summaryLoadingByCandidate[candidate._id]} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-400">
                            {summaryLoadingByCandidate[candidate._id] ? "Generating..." : "Generate Summary"}
                          </button>
                          <button onClick={() => handleGenerateInterviewQuestions(candidate._id)} disabled={questionsLoadingByCandidate[candidate._id]} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-400">
                            {questionsLoadingByCandidate[candidate._id] ? "Generating..." : "Generate Questions"}
                          </button>
                          <textarea
                            value={notesDraft[candidate._id] !== undefined ? notesDraft[candidate._id] : candidate.notes || ""}
                            onChange={(event) => setNotesDraft((current) => ({ ...current, [candidate._id]: event.target.value }))}
                            className="h-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder="recruiter notes"
                          />
                          <button onClick={() => handleSaveNotes(candidate._id)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900">Save Note</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {activeCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setActiveCandidateId(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Candidate Spotlight</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-800">{activeCandidate.filename}</h3>
                  <p className="text-sm text-slate-500">{activeCandidate.email || "-"}</p>
                </div>
                <button onClick={() => setActiveCandidateId(null)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Close</button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">ATS Score</p><p className="mt-1 text-2xl font-bold">{activeCandidate.score}%</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Experience</p><p className="mt-1 text-2xl font-bold">{activeCandidate.yearsExperience || 0}y</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">Stage</p><p className="mt-1 text-xl font-bold">{activeCandidate.status}</p></div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700">Candidate Summary</p>
                <p className="mt-2 text-sm text-slate-600">{getSummaryText(activeCandidate) || "No summary available."}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700">Interview Questions</p>
                {getQuestionList(activeCandidate).length > 0 ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                    {getQuestionList(activeCandidate).map((question, index) => (
                      <li key={`${activeCandidate._id}-q-${index}`}>{question}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No questions generated.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComparisonOpen && comparedCandidates.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setIsComparisonOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Comparison Mode</p>
                  <h3 className="text-2xl font-bold text-slate-800">Candidate vs Candidate</h3>
                </div>
                <button
                  onClick={() => setIsComparisonOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {comparedCandidates.map((candidate) => (
                  <div key={`compare-${candidate._id}`} className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="truncate text-lg font-bold text-slate-800">{candidate.filename}</h4>
                    <p className="mt-1 text-sm text-slate-500">{candidate.email || "-"}</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">ATS Score</p>
                        <p className="text-2xl font-bold">{candidate.score || 0}%</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Experience</p>
                        <p className="text-2xl font-bold">{candidate.yearsExperience || 0}y</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Stage</p>
                        <p className="text-base font-semibold">{candidate.status}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Education</p>
                        <p className="text-base font-semibold">{candidate.educationLevel || "Unknown"}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-emerald-700">Matched Skills</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(candidate.matchedSkills || []).slice(0, 8).map((skill) => (
                          <span key={`${candidate._id}-match-${skill}`} className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                            {skill}
                          </span>
                        ))}
                        {(candidate.matchedSkills || []).length === 0 && (
                          <span className="text-xs text-slate-500">No matched skills</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-rose-700">Missing Skills</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(candidate.missingSkills || []).slice(0, 8).map((skill) => (
                          <span key={`${candidate._id}-miss-${skill}`} className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">
                            {skill}
                          </span>
                        ))}
                        {(candidate.missingSkills || []).length === 0 && (
                          <span className="text-xs text-slate-500">No major gaps</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-700">Generated Summary</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {truncate(getSummaryText(candidate), 320) || "No generated summary available."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
