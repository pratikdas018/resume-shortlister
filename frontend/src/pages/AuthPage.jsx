import { useState } from "react";
import { api, setAuthToken } from "../api";

const initialLoginForm = {
  email: "",
  password: ""
};

const initialRegisterForm = {
  name: "",
  email: "",
  password: ""
};

export default function AuthPage({ onAuthenticated, theme = "light", onToggleTheme = () => {} }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice({ type: "", message: "" });

    try {
      const response = await api.post("/auth/login", loginForm);
      const { token, user } = response.data;
      setAuthToken(token);
      onAuthenticated({ token, user });
    } catch (error) {
      const message = error.response?.data?.error || "Login failed.";
      setNotice({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice({ type: "", message: "" });

    try {
      const response = await api.post("/auth/register", registerForm);
      const { token, user } = response.data;
      setAuthToken(token);
      onAuthenticated({ token, user });
    } catch (error) {
      const message = error.response?.data?.error || "Registration failed.";
      setNotice({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-3xl p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secure Access</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">ATS Authentication</h1>
            <p className="mt-2 text-sm text-slate-600">Register a user account or login to continue.</p>
          </div>
          <button onClick={onToggleTheme} className="quick-action-btn rounded-xl px-4 py-2 text-sm">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </header>

        {notice.message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="glass-panel rounded-3xl p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setMode("login")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-teal-700 text-white" : "quick-action-btn"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "register" ? "bg-sky-700 text-white" : "quick-action-btn"
              }`}
            >
              Register
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="hr@company.com"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="minimum 6 characters"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-fit rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
              >
                {submitting ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Full Name</span>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="HR Manager"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="hr@company.com"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="minimum 6 characters"
                  required
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">New accounts are created as recruiter by default.</p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-fit rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-400"
                >
                  {submitting ? "Creating account..." : "Register"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
