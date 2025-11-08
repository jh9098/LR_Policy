import PropTypes from 'prop-types';
import { useEffect } from 'react';
import EmailPasswordAuthPanel from './EmailPasswordAuthPanel.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AuthModal({ open, onClose }) {
  const { processing, clearFeedback } = useAuth();

  useEffect(() => {
    if (!open) {
      clearFeedback();
    }
  }, [open, clearFeedback]);

  if (!open) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !processing) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
          disabled={processing}
          aria-label="로그인 창 닫기"
        >
          ✕
        </button>
        <EmailPasswordAuthPanel heading="이메일 로그인" description="infoall 관리자 계정을 사용해 로그인해주세요." />
      </div>
    </div>
  );
}

AuthModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};
