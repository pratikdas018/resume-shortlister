import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = ["New", "Screening", "Interview", "Shortlisted", "Rejected"];

const statusChipClassMap = {
  New: "bg-slate-100 text-slate-700",
  Screening: "bg-cyan-100 text-cyan-700",
  Interview: "bg-amber-100 text-amber-700",
  Shortlisted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700"
};

const emptyOverview = {
  generatedAt: null,
  totals: {
    totalCandidates: 0,
    avgScore: 0,
    highFit: 0,
    mediumFit: 0,
    lowFit: 0,
    withEmail: 0,
    aiExperienceDetected: 0
  },
  statusCounts: {
    New: 0,
    Screening: 0,
    Interview: 0,
    Shortlisted: 0,
    Rejected: 0
  },
  experienceBands: {
    "0-1": 0,
    "2-4": 0,
    "5+": 0
  },
  educationDistribution: [],
  topMatchedSkills: [],
  topMissingSkills: [],
  recentCandidates: []
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const percentage = (count, total) => {
  if (!total) return 0;
  return Math.round((count / total) * 100);
};

const ProgressRow = ({ label, count, total, colorClass }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
      <span>{label}</span>
      <span>{count}</span>
    </div>
    <div className="heat-track">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage(count, total)}%` }} />
    </div>
  </div>
);

const SkillTable = ({ title, skillRows, chipClass }) => (
  <section className="glass-panel rounded-3xl p-6">
    <h2 className="text-2xl font-bold">{title}</h2>
    {skillRows.length === 0 ? (
      <p className="mt-3 text-sm text-slate-500">No data yet.</p>
    ) : (
      <div className="mt-4 space-y-3">
        {skillRows.map((item) => (
          <div key={`${title}-${item.skill}`} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${chipClass}`}>{item.skill}</span>
              <span className="text-sm font-bold text-slate-700">{item.count}</span>
            </div>
            <div className="mt-3 heat-track">
              <div className={`h-full rounded-full ${chipClass.split(" ")[0]}`} style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default function AdminDashboard({ theme = "light", onToggleTheme = () => {} }) {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/resumes/admin/overview");
      setOverview({ ...emptyOverview, ...response.data });
      setNotice({ type: "success", message: "Admin overview refreshed." });
    } catch (error) {
      console.error("Failed to load admin overview", error);
      setNotice({ type: "error", message: "Could not load admin overview." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const totalCandidates = overview.totals?.totalCandidates || 0;
  const statusRows = useMemo(
    () => STATUS_OPTIONS.map((status) => ({
      label: status,
      count: overview.statusCounts?.[status] || 0
    })),
    [overview.statusCounts]
  );

  const educationRows = useMemo(
    () => overview.educationDistribution || [],
    [overview.educationDistribution]
  );

  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="glass-panel flex flex-col gap-4 rounded-3xl p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Leadership Console</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Portfolio-level insight across candidate quality, pipeline flow, and skills demand.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
              Updated {formatDateTime(overview.generatedAt)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadOverview} className="quick-action-btn rounded-xl px-4 py-2 text-sm">
              {loading ? "Refreshing..." : "Refresh Overview"}
            </button>
            <button onClick={onToggleTheme} className="quick-action-btn rounded-xl px-4 py-2 text-sm">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </header>

        {notice.message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Total Candidates</p>
            <p className="mt-3 text-3xl font-bold">{overview.totals.totalCandidates}</p>
          </article>
          <article className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Average Match</p>
            <p className="mt-3 text-3xl font-bold">{overview.totals.avgScore}%</p>
          </article>
          <article className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Profiles With Email</p>
            <p className="mt-3 text-3xl font-bold">{overview.totals.withEmail}</p>
          </article>
          <article className="metric-tile rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">AI Experience Parsed</p>
            <p className="mt-3 text-3xl font-bold">{overview.totals.aiExperienceDetected}</p>
          </article>
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="glass-panel rounded-3xl p-6 xl:col-span-7">
            <h2 className="text-2xl font-bold">Pipeline Health</h2>
            <div className="mt-4 space-y-3">
              {statusRows.map((row) => (
                <ProgressRow
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  total={totalCandidates}
                  colorClass="bg-sky-500"
                />
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6 xl:col-span-5">
            <h2 className="text-2xl font-bold">Fit Mix</h2>
            <div className="mt-4 space-y-3">
              <ProgressRow
                label="High Fit (80+)"
                count={overview.totals.highFit}
                total={totalCandidates}
                colorClass="bg-emerald-500"
              />
              <ProgressRow
                label="Medium Fit (60-79)"
                count={overview.totals.mediumFit}
                total={totalCandidates}
                colorClass="bg-cyan-500"
              />
              <ProgressRow
                label="Low Fit (<60)"
                count={overview.totals.lowFit}
                total={totalCandidates}
                colorClass="bg-rose-500"
              />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-sm font-semibold text-slate-700">Experience Bands</p>
              <div className="mt-3 space-y-2">
                <ProgressRow
                  label="0-1 years"
                  count={overview.experienceBands["0-1"]}
                  total={totalCandidates}
                  colorClass="bg-indigo-500"
                />
                <ProgressRow
                  label="2-4 years"
                  count={overview.experienceBands["2-4"]}
                  total={totalCandidates}
                  colorClass="bg-violet-500"
                />
                <ProgressRow
                  label="5+ years"
                  count={overview.experienceBands["5+"]}
                  total={totalCandidates}
                  colorClass="bg-fuchsia-500"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="glass-panel rounded-3xl p-6 xl:col-span-5">
            <h2 className="text-2xl font-bold">Education Distribution</h2>
            {educationRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No education data available.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {educationRows.map((row) => (
                  <ProgressRow
                    key={row.level}
                    label={row.level}
                    count={row.count}
                    total={totalCandidates}
                    colorClass="bg-amber-500"
                  />
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:col-span-7 md:grid-cols-2">
            <SkillTable title="Top Matched Skills" skillRows={overview.topMatchedSkills} chipClass="bg-emerald-100 text-emerald-700" />
            <SkillTable title="Top Missing Skills" skillRows={overview.topMissingSkills} chipClass="bg-rose-100 text-rose-700" />
          </div>
        </div>

        <section className="glass-panel rounded-3xl p-6">
          <h2 className="text-2xl font-bold">Recent Candidates</h2>
          {overview.recentCandidates.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No candidate activity yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-3 py-2">Candidate</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Experience</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Added At</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentCandidates.map((candidate) => (
                    <tr key={candidate._id} className="rounded-2xl bg-white shadow-sm">
                      <td className="rounded-l-2xl px-3 py-3 align-top">
                        <p className="max-w-80 truncate font-semibold text-slate-800">{candidate.filename}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-sm font-bold text-slate-800">{candidate.score || 0}%</td>
                      <td className="px-3 py-3 align-top text-sm text-slate-700">{candidate.yearsExperience || 0}y</td>
                      <td className="px-3 py-3 align-top">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusChipClassMap[candidate.status] || "bg-slate-100 text-slate-700"}`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 align-top text-sm text-slate-600">
                        {formatDateTime(candidate.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
