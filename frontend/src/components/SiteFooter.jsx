// frontend/src/components/SiteFooter.jsx

import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { label: '회사소개', to: '/company' },
  { label: '제휴안내', to: '/partnership' },
  { label: '광고안내', to: '/advertising' },
  { label: '이용약관', to: '/terms' },
  { label: '개인정보처리방침', to: '/privacy' },
  { label: '청소년보호정책', to: '/youth-protection' }
];

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/90 py-10 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-6 rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-none sm:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">문의</h2>
            <dl className="space-y-2 text-sm leading-relaxed">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">전화번호</dt>
                <dd className="text-slate-700 dark:text-slate-200">010-9850-5711</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">이메일</dt>
                <dd className="text-slate-700 dark:text-slate-200">stocksrlab@naver.com</dd>
              </div>
            </dl>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">사업자정보</h2>
            <dl className="space-y-2 text-sm leading-relaxed">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">상호명</dt>
                <dd className="text-slate-700 dark:text-slate-200">바른제품</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">대표자</dt>
                <dd className="text-slate-700 dark:text-slate-200">최지훈</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">소재지</dt>
                <dd className="text-slate-700 dark:text-slate-200">서울특별시 종로구 사직로8길 24, 905호</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <dt className="font-medium text-slate-500 dark:text-slate-400">사업자등록번호</dt>
                <dd className="text-slate-700 dark:text-slate-200">577-21-00922</dd>
              </div>
            </dl>
          </section>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Copyright ⓒ 2025 - 2025 infoall. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
