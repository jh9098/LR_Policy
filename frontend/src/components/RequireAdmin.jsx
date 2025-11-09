import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import EmailPasswordAuthPanel from './EmailPasswordAuthPanel.jsx';

export default function RequireAdmin({ children }) {
  const { user, hasAdminAccess, adminRole, loading, adminError, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10 text-sm text-slate-600 dark:text-slate-300">
        관리자 권한을 확인하는 중입니다...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">관리자 로그인 필요</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            /admin 페이지는 관리자 전용입니다. infoall에서 발급받은 관리자 계정으로 로그인해주세요.
          </p>
        </div>
        <EmailPasswordAuthPanel
          className="w-full max-w-sm"
          heading="관리자 로그인"
          description="관리자용 이메일과 비밀번호를 입력해주세요."
        />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">관리자 권한이 없습니다.</h2>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
          이 계정에는 관리자 권한이 없습니다. 관리자 권한이 있는 다른 계정으로 로그인하거나 운영팀에 문의해주세요.
        </p>
        {adminError ? (
          <p className="text-xs text-rose-600 dark:text-rose-300">{adminError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            logout().catch((error) => {
              console.warn('로그아웃 처리 중 오류가 발생했습니다.', error);
            });
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:focus-visible:ring-offset-slate-900"
        >
          로그아웃 후 다른 계정으로 시도
        </button>
      </div>
    );
  }

  const pathname = location.pathname.replace(/\/*$/, '') || '/admin';

  if (adminRole === 'groupp') {
    const isAllowedPath =
      pathname === '/admin' ||
      pathname === '/admin/new' ||
      pathname === '/admin/list' ||
      pathname.startsWith('/admin/edit');

    if (!isAllowedPath) {
      return <Navigate to="/admin/list" replace />;
    }
  }

  return children;
}

RequireAdmin.propTypes = {
  children: PropTypes.node
};
