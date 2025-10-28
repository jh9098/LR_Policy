// frontend/src/components/SiteHeader.jsx
import { Link, NavLink } from 'react-router-dom';

const navLinkBaseClass =
  'text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md px-2 py-1';

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md px-1"
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
                isActive ? 'text-indigo-600' : 'text-slate-600'
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
                isActive ? 'text-indigo-600' : 'text-slate-600'
              ].join(' ')
            }
          >
            관리자 입력
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
