// frontend/src/contexts/SignupFormSettingsContext.jsx
// 회원가입/로그인 입력 항목 구성을 전역으로 제공하는 컨텍스트.
// 앱 초기 로드 시 Firestore에서 설정을 가져오고, 관리자 페이지에서 저장하면 새로고침 없이 반영할 수 있다.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { createDefaultSignupFormConfig, normalizeSignupFormConfig } from '../constants/signupFormConfig.js';
import { getSignupFormSettings } from '../firebaseClient.js';

const SignupFormSettingsContext = createContext({
  config: createDefaultSignupFormConfig(),
  meta: { updatedAt: null, updatedBy: '' },
  loading: true,
  error: '',
  refresh: async () => {}
});

export function SignupFormSettingsProvider({ children }) {
  const [config, setConfig] = useState(() => createDefaultSignupFormConfig());
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSignupFormSettings();
      const normalized = normalizeSignupFormConfig(data?.config ?? {});
      setConfig(normalized);
      setMeta({ updatedAt: data?.updatedAt ?? null, updatedBy: data?.updatedBy ?? '' });
      setError('');
    } catch (err) {
      console.error('회원가입 폼 설정 불러오기 실패:', err);
      setError('회원가입 폼 설정을 불러오지 못했습니다. 기본값이 사용됩니다.');
      setConfig((prev) => normalizeSignupFormConfig(prev));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      config,
      meta,
      loading,
      error,
      refresh
    }),
    [config, meta, loading, error, refresh]
  );

  return <SignupFormSettingsContext.Provider value={value}>{children}</SignupFormSettingsContext.Provider>;
}

SignupFormSettingsProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useSignupFormSettings() {
  return useContext(SignupFormSettingsContext);
}
