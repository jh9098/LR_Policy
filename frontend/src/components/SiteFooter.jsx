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
    <footer className="border-t border-slate-200 bg-white/90 py-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6">
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
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Copyright ⓒ 2025 - 2025 infoall. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
