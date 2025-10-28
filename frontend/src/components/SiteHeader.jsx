// frontend/src/components/SiteHeader.jsx
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navLinkBaseClass =
  'text-sm font-medium transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md px-2 py-1 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900';

const THEME_STORAGE_KEY = 'efa-theme-preference';

function applyThemeClass(theme) {
  // Tailwind 의 dark 모드를 html 루트 클래스에 붙여 토글한다.
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
    // 초기 진입 시 로컬 저장소를 확인해서 사용자의 선호 테마를 복원한다.
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        applyThemeClass(saved);
        return;
      }
    } catch (error) {
      console.warn('테마 복원 실패:', error);
    }

    // 저장된 값이 없으면 OS 다크모드 여부를 참고한다.
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      applyThemeClass('dark');
    }
  }, []);

  useEffect(() => {
    // 테마가 바뀔 때마다 html class 와 localStorage 를 업데이트한다.
    if (typeof window === 'undefined') {
      return;
    }

    applyThemeClass(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('테마 저장 실패:', error);
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
          className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md px-1 dark:text-slate-100 dark:focus-visible:ring-offset-slate-900"
        >
          {/* 좌측 브랜드 텍스트: 우리 서비스의 정체성을 명확히 드러낸다 */}
          사건 프레임 아카이브
        </Link>
        <nav className="flex items-center gap-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              [
                navLinkBaseClass,
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
                navLinkBaseClass,
                isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'
              ].join(' ')
            }
          >
            관리자 입력
          </NavLink>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
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
