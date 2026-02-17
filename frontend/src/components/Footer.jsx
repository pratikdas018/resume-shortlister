export default function Footer() {
  return (
    <footer className="px-4 pb-6 md:px-10 md:pb-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="glass-panel rounded-2xl px-4 py-3 text-center text-xs text-slate-600 md:text-sm">
          <p>
            {new Date().getFullYear()} Resume Shortlister ATS. Built for faster recruiter decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
