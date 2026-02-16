import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import { api, AUTH_TOKEN_STORAGE_KEY, setAuthToken } from "./api";

function App() {
  const [workspace, setWorkspace] = useState("recruiter");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return window.localStorage.getItem("ats-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("ats-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const initializeSession = async () => {
      const token = typeof window === "undefined"
        ? ""
        : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const user = response.data?.user || null;
        setCurrentUser(user);
        if (user?.role === "admin") {
          setWorkspace("admin");
        } else {
          setWorkspace("recruiter");
        }
      } catch {
        setAuthToken("");
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeSession();
  }, []);

  const handleAuthenticated = ({ token, user }) => {
    setAuthToken(token);
    setCurrentUser(user);
    if (user?.role === "admin") {
      setWorkspace("admin");
    } else {
      setWorkspace("recruiter");
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setCurrentUser(null);
    setWorkspace("recruiter");
  };

  const canAccessAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!canAccessAdmin && workspace === "admin") {
      setWorkspace("recruiter");
    }
  }, [canAccessAdmin, workspace]);

  if (authLoading) {
    return (
      <div className="min-h-screen px-4 py-10 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="glass-panel rounded-3xl p-6">
            <p className="text-sm text-slate-600">Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 md:px-10">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWorkspace("recruiter")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                workspace === "recruiter"
                  ? "bg-teal-700 text-white"
                  : "quick-action-btn"
              }`}
            >
              Recruiter Workspace
            </button>
            {canAccessAdmin && (
              <button
                onClick={() => setWorkspace("admin")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  workspace === "admin"
                    ? "bg-sky-700 text-white"
                    : "quick-action-btn"
                }`}
              >
                Admin Dashboard
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100">
              {currentUser.name} ({currentUser.role})
            </span>
            <button onClick={toggleTheme} className="quick-action-btn rounded-xl px-4 py-2 text-sm">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button onClick={handleLogout} className="quick-action-btn rounded-xl px-4 py-2 text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      {workspace === "recruiter" ? (
        <Dashboard theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <AdminDashboard theme={theme} onToggleTheme={toggleTheme} />
      )}
    </div>
  );
}

export default App;
