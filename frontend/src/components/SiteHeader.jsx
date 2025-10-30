// frontend/src/components/SiteHeader.jsx
// 공용 상단 헤더. 다크 모드 토글과 /admin 링크를 제공한다.
// 지금은 누구나 /admin에 들어와 Firestore에 직접 쓰기 때문에 URL 노출에 주의해야 한다.

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { THEME_NAV_ITEMS } from '../constants/themeConfig.js';

const navBaseClass =
  'rounded-md px-2 py-1 text-sm font-medium transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900';
const THEME_STORAGE_KEY = 'efa-theme-preference';

function applyTheme(theme) {
  if (typeof document === 'undefined') {
    return;
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function SiteHeader() {
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored);
        applyTheme(stored);
        return;
      }
    } catch (error) {
      console.warn('테마 선호도 불러오기 실패:', error);
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      applyTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('테마 선호도 저장 실패:', error);
    }
  }, [theme]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const navLinkClassName = ({ isActive }) =>
    [
      navBaseClass,
      isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300',
      'block'
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="rounded-md px-1 text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-100 dark:focus-visible:ring-offset-slate-900"
        >
          infoall
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-base shadow-sm transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
            aria-label="다크 모드 전환"
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="site-header-mobile-nav"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-base shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400/80 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
          >
            <span className="sr-only">메뉴 열기/닫기</span>
            <span aria-hidden="true">{isMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        <nav className="hidden items-center gap-3 md:flex">
          <NavLink to="/" className={navLinkClassName}>
            홈
          </NavLink>
          {THEME_NAV_ITEMS.map((item) => (
            <NavLink key={item.id} to={item.to} className={navLinkClassName}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/admin" className={navLinkClassName}>
            관리자
          </NavLink>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-base shadow-sm transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
            aria-label="다크 모드 전환"
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
        </nav>
      </div>
      <nav
        id="site-header-mobile-nav"
        className={`md:hidden transition-all duration-200 ease-out ${
          isMenuOpen
            ? 'max-h-40 border-t border-slate-200 bg-white/95 opacity-100 dark:border-slate-700 dark:bg-slate-900/95'
            : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="space-y-1 px-4 pb-4 pt-3 text-sm font-medium sm:px-6">
          <NavLink to="/" className={navLinkClassName}>
            홈
          </NavLink>
          {THEME_NAV_ITEMS.map((item) => (
            <NavLink key={item.id} to={item.to} className={navLinkClassName}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/admin" className={navLinkClassName}>
            관리자
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

export default SiteHeader;
