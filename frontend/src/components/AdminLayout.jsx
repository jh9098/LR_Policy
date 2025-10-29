// frontend/src/components/AdminLayout.jsx
// 관리자용 공통 레이아웃이다. 지금은 누구나 /admin/* 경로에 접근 가능하며 Firestore도 직접 수정할 수 있다.
// TODO(프로덕션): 이 페이지 접근 자체를 보호하고 Firestore 보안 규칙을 잠궈야 한다.

import { NavLink, Outlet } from 'react-router-dom';
import { useMemo, useState } from 'react';

const NAV_ITEMS = [
  { type: 'route', label: '새 글 작성', to: '/admin/new', description: '운영용 초안 작성 및 실시간 미리보기' },
  { type: 'route', label: '등록된 글 목록', to: '/admin/list', description: 'Firestore에 저장된 최신 콘텐츠 관리' },
  { type: 'placeholder', label: '환경/설정 (준비 중)', description: 'TODO: 향후 운영 환경 설정 페이지' },
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
                  : 'text-slate-600 dark:text-slate-300',
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
      {/* TODO: 실서비스에서는 /admin 전체를 인증과 권한으로 보호해야 한다. */}
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:h-auto lg:w-72 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">운영 도구</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">관리자 대시보드</h1>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                개발 단계에서는 비밀번호 없이 누구나 접근할 수 있습니다. URL 공개에 주의하세요.
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
                새 정책/사건을 등록하고 기존 콘텐츠를 관리하는 내부 도구입니다. 지금은 인증이 없으니 URL을 외부에 공개하지 마세요.
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
