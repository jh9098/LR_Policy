// frontend/src/components/AdminLayout.jsx
// 현재 /admin/* 페이지는 인증 없이 누구나 접근 가능하다.
// TODO(프로덕션): 관리자 인증, Firestore 보안 규칙 잠금, 접근 제한을 반드시 구현해야 한다.

import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { type: 'route', label: '새 글 작성', to: '/admin/new', description: 'AI JSON 붙여넣기 + Firestore 등록' },
  { type: 'route', label: '등록된 글 목록', to: '/admin/list', description: 'Firestore에서 직접 불러온 목록 관리' },
  { type: 'placeholder', label: '환경/설정 (준비 중)', description: 'TODO: 향후 접근 제한 및 감사 로그' }
];

function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = useMemo(
    () =>
      NAV_ITEMS.map((item, index) => {
        if (item.type === 'placeholder') {
          return (
            <div
              key={`placeholder-${index}`}
              className="flex flex-col gap-1 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500"
            >
              <span>{item.label}</span>
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{item.description}</span>
            </div>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex flex-col gap-1 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold transition',
                'hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100',
                'dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200',
                'dark:focus-visible:ring-offset-slate-900',
                isActive
                  ? 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-500/70 dark:bg-indigo-500/20 dark:text-indigo-200'
                  : 'text-slate-600 dark:text-slate-300'
              ].join(' ')
            }
            onClick={() => setIsMenuOpen(false)}
            aria-label={item.description}
          >
            <span>{item.label}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.description}</span>
          </NavLink>
        );
      }),
    []
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:h-auto lg:w-72 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">운영 도구</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">infoall 관리자</h1>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                현재는 개발 편의를 위해 누구나 /admin에 접근할 수 있으며 Firestore에 직접 쓰기까지 가능하다.
                {' '}TODO: 실제 서비스에서는 접근 자체를 보호해야 한다.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-sm shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900 lg:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">메뉴 토글</span>
              {isMenuOpen ? '닫기' : '메뉴'}
            </button>
          </div>
          <nav className={`mt-6 grid gap-2 lg:mt-10 ${isMenuOpen ? 'grid-rows-[1fr]' : 'hidden lg:grid'}`}>
            {navigation}
          </nav>
        </aside>

        <main className="flex-1 bg-slate-50/40 px-4 py-6 dark:bg-slate-900/40 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-xl font-semibold">운영 대시보드</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                모든 CRUD 작업이 Firestore Web SDK를 통해 브라우저에서 직접 이루어진다. 지금은 누구나 데이터를 변경할 수 있으니 URL을 외부에 공유하지 마라.
                테마 필드를 꼭 선택해 infoall 홈과 테마 페이지에 정확히 반영되도록 관리해 달라.
              </p>
            </header>
            <div className="pb-16">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
