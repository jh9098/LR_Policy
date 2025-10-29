// frontend/src/components/SiteHeader.jsx
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navBaseClass =
  'rounded-md px-2 py-1 text-sm font-medium transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900';
const THEME_STORAGE_KEY = 'efa-theme-preference';

function applyTheme(theme) {
  // Tailwind 의 dark 모드는 HTML 루트 요소에 class="dark"를 붙이는 방식으로 제어한다.
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

  useEffect(() => {
    // 초기 진입 시 로컬 저장소 혹은 OS 모드에서 기본값을 찾는다.
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
    // 사용자가 테마를 변경하면 HTML 클래스와 로컬 저장소 모두를 갱신한다.
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

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="rounded-md px-1 text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-100 dark:focus-visible:ring-offset-slate-900"
        >
          사건 프레임 아카이브
        </Link>
        <nav className="flex items-center gap-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              [
                navBaseClass,
                isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'
              ].join(' ')
            }
          >
            홈
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              [
                navBaseClass,
                isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'
              ].join(' ')
            }
          >
            관리자 대시보드
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
    </header>
  );
}

export default SiteHeader;
