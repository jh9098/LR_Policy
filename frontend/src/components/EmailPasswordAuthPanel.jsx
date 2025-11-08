import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';

const MODE = {
  LOGIN: 'login',
  REGISTER: 'register'
};

const GENDER_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'other', label: '기타' }
];

const INITIAL_FORM = {
  email: '',
  confirmEmail: '',
  password: '',
  confirmPassword: '',
  name: '',
  gender: '',
  birthYear: '',
  phone: ''
};

function InputLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
      {children}
    </label>
  );
}

InputLabel.propTypes = {
  htmlFor: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default function EmailPasswordAuthPanel({ className = '', heading = '이메일 로그인', description = '' }) {
  const { user, login, register, requestPasswordReset, processing, authError, authMessage, clearFeedback } = useAuth();
  const [mode, setMode] = useState(MODE.LOGIN);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (user) {
      return;
    }
    clearFeedback();
  }, [mode, clearFeedback, user]);

  const headingText = useMemo(() => {
    if (heading) return heading;
    return mode === MODE.LOGIN ? '이메일 로그인' : '회원가입';
  }, [heading, mode]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (mode === MODE.LOGIN) {
        await login(form.email.trim(), form.password);
        return;
      }
      await register({
        email: form.email.trim(),
        confirmEmail: form.confirmEmail.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        name: form.name,
        gender: form.gender,
        birthYear: form.birthYear,
        phone: form.phone
      });
    } catch (error) {
      console.warn('인증 처리 중 오류가 발생했습니다.', error);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await requestPasswordReset(form.email.trim());
    } catch (error) {
      console.warn('비밀번호 재설정 요청 중 오류가 발생했습니다.', error);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === MODE.LOGIN ? MODE.REGISTER : MODE.LOGIN));
  };

  const descriptionText = useMemo(() => {
    if (description) return description;
    return mode === MODE.LOGIN
      ? '등록된 이메일과 비밀번호를 입력해주세요.'
      : '이메일과 비밀번호를 다시 한 번 입력해 일치 여부를 확인해주세요.';
  }, [description, mode]);

  if (user) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800/90 ${className}`}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{headingText}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descriptionText}</p>
        </div>

        <div className="space-y-2">
          <div>
            <InputLabel htmlFor="auth-email">이메일</InputLabel>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="example@email.com"
              autoComplete="email"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">비밀번호 재발급 시 사용할 이메일을 입력해주세요.</p>
          </div>

          {mode === MODE.REGISTER && (
            <div>
              <InputLabel htmlFor="auth-confirm-email">이메일 재입력</InputLabel>
              <input
                id="auth-confirm-email"
                name="confirmEmail"
                type="email"
                value={form.confirmEmail}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="이메일을 한 번 더 입력하세요"
                autoComplete="email"
              />
            </div>
          )}

          <div>
            <InputLabel htmlFor="auth-password">비밀번호</InputLabel>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="비밀번호"
              autoComplete={mode === MODE.LOGIN ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === MODE.REGISTER && (
            <div>
              <InputLabel htmlFor="auth-confirm-password">비밀번호 재입력</InputLabel>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === MODE.REGISTER && (
            <div className="grid gap-2 rounded-lg bg-slate-50/70 p-3 dark:bg-slate-900/50">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">선택 입력 항목</p>
              <div>
                <InputLabel htmlFor="auth-name">이름</InputLabel>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="선택사항"
                  autoComplete="name"
                />
              </div>
              <div>
                <InputLabel htmlFor="auth-gender">성별</InputLabel>
                <select
                  id="auth-gender"
                  name="gender"
                  value={form.gender}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <InputLabel htmlFor="auth-birth">출생연도</InputLabel>
                <input
                  id="auth-birth"
                  name="birthYear"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={form.birthYear}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="예: 1990"
                />
              </div>
              <div>
                <InputLabel htmlFor="auth-phone">전화번호</InputLabel>
                <input
                  id="auth-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="선택사항"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}
        </div>

        {authError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {authError}
          </div>
        )}
        {authMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {authMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400 dark:focus-visible:ring-offset-slate-900"
            disabled={processing}
          >
            {mode === MODE.LOGIN ? '로그인' : '회원가입'}
          </button>
          <button
            type="button"
            onClick={toggleMode}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:focus-visible:ring-offset-slate-900"
            disabled={processing}
          >
            {mode === MODE.LOGIN ? '회원가입 화면으로' : '로그인 화면으로'}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePasswordReset}
          className="text-[11px] text-slate-500 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-300"
          disabled={processing}
        >
          비밀번호 재설정
        </button>
      </form>
    </div>
  );
}

EmailPasswordAuthPanel.propTypes = {
  className: PropTypes.string,
  heading: PropTypes.string,
  description: PropTypes.string
};
