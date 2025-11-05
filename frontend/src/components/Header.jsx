// src/components/Header.jsx
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { THEME_CONFIG } from '../constants/themeConfig.js';

export default function Header() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');

  useEffect(() => {
    setQ(sp.get('q') ?? '');
  }, [sp]);

  const onSubmit = useCallback(
    (e) => {
      if (e?.preventDefault) e.preventDefault();
      const trimmed = (q ?? '').trim();
      if (trimmed) navigate(`/?q=${encodeURIComponent(trimmed)}`);
      else navigate(`/`);
    },
    [navigate, q]
  );

  const onReset = useCallback(() => {
    setQ('');
    navigate('/');
  }, [navigate]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* 1줄 고정: logo | search | actions (Flex) */}
        <div className="flex items-center gap-3 py-3">
          {/* logo */}
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-slate-900 hover:opacity-80 dark:text-slate-100"
          >
            infoall
          </Link>

          {/* search: 로고 오른쪽에 딱 붙게, 남는 공간 100% 사용 */}
          <form
            onSubmit={onSubmit}
            role="search"
            aria-label="사이트 검색"
            className="ml-1 min-w-0 flex-1"
          >
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="키워드로 전체 테마 검색"
                className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm outline-none ring-0 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </form>

          {/* actions (우측 버튼들) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSubmit}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none"
            >
              검색
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/60"
            >
              초기화
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/60"
              aria-label="모드 전환"
              title="모드 전환"
            >
              ☀️
            </button>
          </div>
        </div>

        {/* 2줄: 카테고리 탭 */}
        <nav className="flex items-center gap-4 overflow-x-auto pb-3 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `shrink-0 border-b-2 pb-2 ${
                isActive
                  ? 'border-indigo-600 font-semibold text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`
            }
          >
            홈
          </NavLink>

          {THEME_CONFIG.map((t) => (
            <NavLink
              key={t.id}
              to={`/theme/${t.id}`}
              className={({ isActive }) =>
                `shrink-0 border-b-2 pb-2 ${
                  isActive
                    ? 'border-indigo-600 font-semibold text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}

          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `ml-auto shrink-0 border-b-2 pb-2 ${
                isActive
                  ? 'border-indigo-600 font-semibold text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`
            }
          >
            관리자
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
