// src/components/SiteHeader.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { THEME_NAV_ITEMS } from "../constants/themeConfig.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAuthDialog } from "../contexts/AuthDialogContext.jsx";

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
  const { user, logout } = useAuth();
  const { openLogin } = useAuthDialog();

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
  const handleAuthButtonClick = () => {
    if (user) {
      logout().catch((error) => {
        console.warn("로그아웃 처리 중 오류가 발생했습니다.", error);
        window.alert("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.");
      });
      return;
    }
    openLogin();
  };
  const displayName = useMemo(() => {
    if (!user) return "";
    return user.displayName?.trim() || user.email || "로그인 사용자";
  }, [user]);
  const isScrapOpen = sp.get("scrap") === "open";

  const navLinkClassName = ({ isActive }) =>
    [
      navBaseClass,
      isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300",
      "block"
    ].join(" ");

  const handleScrapButtonClick = () => {
    if (!user) {
      openLogin();
      return;
    }

    const nextSearchParams = new URLSearchParams(sp);
    if (isScrapOpen) nextSearchParams.delete("scrap");
    else nextSearchParams.set("scrap", "open");

    const searchString = nextSearchParams.toString();
    navigate(
      {
        pathname: "/",
        search: searchString ? `?${searchString}` : ""
      },
      { replace: location.pathname === "/" }
    );
  };

  return (
    <>
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
            {q ? (
              <button
                type="button"
                onClick={onResetSearch}
                className="absolute inset-y-0 right-3 my-auto inline-flex h-7 items-center justify-center rounded-full bg-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus-visible:ring-offset-slate-900"
              >
                초기화
              </button>
            ) : null}
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
          {user ? (
            <div className="flex min-w-[8rem] shrink-0 flex-col items-end gap-1">
              <span className="hidden w-full rounded-lg border border-slate-200 px-3 py-1 text-right text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300 sm:block">
                {displayName}
              </span>
              <button
                type="button"
                onClick={handleScrapButtonClick}
                className="inline-flex w-full items-center justify-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500/20 dark:text-indigo-200 dark:hover:bg-indigo-500/30 dark:focus-visible:ring-offset-slate-900"
              >
                {isScrapOpen ? "내 스크랩 닫기" : "내 스크랩 보기"}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleAuthButtonClick}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
              user ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {user ? '로그아웃' : '로그인'}
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
    </>
  );
}
