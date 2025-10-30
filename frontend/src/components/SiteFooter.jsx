// frontend/src/components/SiteFooter.jsx

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} infoall</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
