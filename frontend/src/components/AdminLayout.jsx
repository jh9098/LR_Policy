// frontend/src/components/AdminLayout.jsx
// 현재 /admin/* 페이지는 인증 없이 누구나 접근 가능하다.
// TODO(프로덕션): 관리자 인증, Firestore 보안 규칙 잠금, 접근 제한을 반드시 구현해야 한다.

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader.jsx';

const NAV_ITEMS = [
  { type: 'route', label: '새 글 작성', to: '/admin/new', description: 'Firestore에 새 글을 추가합니다.' },
  { type: 'route', label: '등록된 글 목록', to: '/admin/list', description: '기존 글을 검색하고 수정/삭제합니다.' },
  { type: 'route', label: '환경/설정', to: '/admin/settings', description: '회사소개·정책 페이지 내용을 관리합니다.' }
];

export default function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      {/* ✅ 사이트 공용 상단 메뉴 (Home과 동일) */}
      <SiteHeader />

      {/* Admin 전용 상단 바 */}
      <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900 lg:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="관리 메뉴 토글"
            >
              {isMenuOpen ? '닫기' : '메뉴'}
            </button>
          </div>

          {/* Admin 탭 네비게이션 */}
          <nav
            className={`${isMenuOpen ? 'flex' : 'hidden'} flex-col gap-2 border-t border-slate-200 pt-3 text-sm lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:border-none lg:pt-0`}
          >
            {NAV_ITEMS.map((item, index) => {
              if (item.type === 'placeholder') {
                return (
                  <div
                    key={`placeholder-${index}`}
                    className="flex flex-col gap-1 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{item.description}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                      'dark:focus-visible:ring-offset-slate-900',
                      isActive
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/80 dark:bg-indigo-500/10 dark:text-indigo-100'
                        : 'border-transparent text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100'
                    ].join(' ')
                  }
                  onClick={() => setIsMenuOpen(false)}
                  aria-label={item.description}
                >
                  <span>{item.label}</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{item.description}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 본문 */}
      <main className="bg-slate-50/40 px-4 py-6 dark:bg-slate-900/40 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="pb-16">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
