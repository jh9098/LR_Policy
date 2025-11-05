// src/components/SiteHeader.jsx
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { THEME_NAV_ITEMS } from "../constants/themeConfig.js";

const navBaseClass =
  "rounded-md px-2 py-1 text-sm font-medium transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900";

const THEME_STORAGE_KEY = "efa-theme-preference";
const applyTheme = (t) => {
  if (typeof document === "undefined") return;
  if (t === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
};

export default function SiteHeader() {
  const [theme, setTheme] = useState("light");
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        applyTheme(stored);
        return;
      }
    } catch {}
    if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
      setTheme("dark");
      applyTheme("dark");
    }
  }, []);
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp, location.key]);

  const onSubmitSearch = (e) => {
    e?.preventDefault?.();
    const keyword = (q || "").trim();
    if (keyword) navigate(`/?q=${encodeURIComponent(keyword)}`);
    else navigate("/");
  };
  const onResetSearch = () => {
    setQ("");
    navigate("/");
  };
  const navLinkClassName = ({ isActive }) =>
    [
      navBaseClass,
      isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300",
      "block"
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      {/* 1행: 로고 | 검색 | 버튼들 — 한 줄 고정 */}
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 flex-nowrap">
        {/* 로고 */}
        <Link
          to="/"
          className="shrink-0 rounded-md px-1 text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-100 dark:focus-visible:ring-offset-slate-900"
        >
          infoall
        </Link>

        {/* 검색창 */}
        <form onSubmit={onSubmitSearch} role="search" aria-label="사이트 검색" className="flex-1 min-w-0">
          <div className="relative">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="키워드로 전체 테마 검색"
              className="w-full rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
            />
          </div>
        </form>

        {/* 버튼들 */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onSubmitSearch}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            검색
          </button>
          <button
            type="button"
            onClick={onResetSearch}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-base shadow-sm transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
            aria-label="다크 모드 전환"
            title="다크 모드 전환"
          >
            <span aria-hidden="true">{theme === "dark" ? "🌙" : "☀️"}</span>
          </button>
        </div>
      </div>

      {/* 2행: 네비게이션 */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-3 sm:px-6">
        <nav className="flex items-center gap-2 overflow-x-auto text-sm">
          <NavLink to="/" end className={navLinkClassName}>
            홈
          </NavLink>
          {THEME_NAV_ITEMS.map((item) => (
            <NavLink key={item.id} to={item.to} className={navLinkClassName}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/admin"
          className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300"
        >
          관리자
        </Link>
      </div>
    </header>
  );
}
