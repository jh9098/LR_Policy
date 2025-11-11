import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getAdminRole,
  registerUserWithEmail,
  saveUserProfile,
  sendPasswordReset,
  signInUserWithEmail,
  signOutUser,
  subscribeAuthState,
  updateAuthProfile
} from '../firebaseClient.js';
import { buildFieldMap, getFieldLabel, normalizeSignupFormConfig } from '../constants/signupFormConfig.js';

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  hasAdminAccess: false,
  adminRole: '',
  canManageGroupbuy: false,
  adminRecord: null,
  loading: true,
  processing: false,
  authError: '',
  authMessage: '',
  adminError: '',
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  requestPasswordReset: async () => {},
  clearFeedback: () => {}
});

const ERROR_MESSAGE_MAP = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/invalid-email': '유효한 이메일 주소를 입력해주세요.',
  'auth/invalid-login-credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-disabled': '비활성화된 계정입니다. 관리자에게 문의해주세요.',
  'auth/user-not-found': '등록되지 않은 이메일입니다.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/weak-password': '비밀번호는 6자 이상으로 설정해주세요.'
};

function resolveFirebaseError(error) {
  if (!error) return '알 수 없는 오류가 발생했습니다.';
  const mapped = ERROR_MESSAGE_MAP[error.code];
  if (mapped) return mapped;
  if (typeof error.message === 'string' && error.message.trim()) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [adminRole, setAdminRole] = useState('');
  const [adminRecord, setAdminRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const unsubscribe = subscribeAuthState(async (firebaseUser) => {
      if (!isMounted) return;
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setHasAdminAccess(false);
        setAdminRole('');
        setAdminRecord(null);
        setAdminError('');
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(true);
      try {
        const adminInfo = await getAdminRole(firebaseUser.uid);
        if (!isMounted) return;
        const role = typeof adminInfo?.role === 'string' ? adminInfo.role : '';
        setAdminRecord(adminInfo ? { ...adminInfo, role } : null);
        setAdminRole(role);
        setIsAdmin(role === 'admin');
        setHasAdminAccess(role === 'admin' || role === 'groupp');
        setAdminError('');
      } catch (error) {
        console.error('관리자 권한 확인 실패:', error);
        if (!isMounted) return;
        setAdminRecord(null);
        setIsAdmin(false);
        setHasAdminAccess(false);
        setAdminRole('');
        setAdminError('관리자 권한을 확인하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const clearFeedback = useCallback(() => {
    setAuthError('');
    setAuthMessage('');
  }, []);

  const login = async (email, password) => {
    clearFeedback();
    if (!email || !password) {
      setAuthError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setProcessing(true);
    try {
      await signInUserWithEmail(email, password);
      setAuthMessage('로그인되었습니다.');
    } catch (error) {
      console.error('로그인 실패:', error);
      setAuthError(resolveFirebaseError(error));
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const register = async ({ values = {}, config }) => {
    clearFeedback();

    const normalizedConfig = normalizeSignupFormConfig(config ?? {});
    const fieldMap = buildFieldMap(normalizedConfig.fields);
    const { emailFieldId, confirmEmailFieldId, passwordFieldId, confirmPasswordFieldId, displayNameFieldId } =
      normalizedConfig.identity;

    if (!emailFieldId || !passwordFieldId) {
      setAuthError('관리자 설정에 이메일 또는 비밀번호 항목이 지정되지 않았습니다.');
      return;
    }

    const email = typeof values[emailFieldId] === 'string' ? values[emailFieldId].trim() : '';
    const confirmEmail =
      confirmEmailFieldId && typeof values[confirmEmailFieldId] === 'string'
        ? values[confirmEmailFieldId].trim()
        : email;
    const password = typeof values[passwordFieldId] === 'string' ? values[passwordFieldId] : '';
    const confirmPassword =
      confirmPasswordFieldId && typeof values[confirmPasswordFieldId] === 'string'
        ? values[confirmPasswordFieldId]
        : password;

    if (!email || !password) {
      setAuthError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (email !== confirmEmail) {
      const label = getFieldLabel(fieldMap[confirmEmailFieldId] ?? fieldMap[emailFieldId]);
      setAuthError(`${label || '이메일 확인'} 값이 이메일과 일치하지 않습니다.`);
      return;
    }
    if (password !== confirmPassword) {
      const label = getFieldLabel(fieldMap[confirmPasswordFieldId] ?? fieldMap[passwordFieldId]);
      setAuthError(`${label || '비밀번호 확인'} 값이 비밀번호와 일치하지 않습니다.`);
      return;
    }

    const missingField = normalizedConfig.fields.find((field) => {
      if (!field.enabledModes.includes('register') || !field.requiredModes.includes('register')) {
        return false;
      }
      const rawValue = values[field.id];
      if (rawValue === null || rawValue === undefined) {
        return true;
      }
      if (typeof rawValue === 'string') {
        return rawValue.trim().length === 0;
      }
      return String(rawValue).trim().length === 0;
    });

    if (missingField) {
      setAuthError(`${getFieldLabel(missingField)} 항목을 입력해주세요.`);
      return;
    }

    setProcessing(true);
    try {
      const credential = await registerUserWithEmail(email, password);

      const profileData = {
        email,
        updatedAt: new Date().toISOString()
      };

      normalizedConfig.fields.forEach((field) => {
        if (!field.enabledModes.includes('register')) return;
        if (field.type === 'password') return;
        if ([emailFieldId, confirmEmailFieldId, passwordFieldId, confirmPasswordFieldId].includes(field.id)) return;

        const rawValue = values[field.id];
        if (rawValue === undefined || rawValue === null) {
          profileData[field.id] = '';
          return;
        }
        if (typeof rawValue === 'string') {
          profileData[field.id] = rawValue.trim();
        } else {
          profileData[field.id] = String(rawValue);
        }
      });

      await saveUserProfile(credential.user.uid, profileData);

      if (displayNameFieldId) {
        const nameValue = values[displayNameFieldId];
        if (typeof nameValue === 'string' && nameValue.trim()) {
          await updateAuthProfile(credential.user, { displayName: nameValue.trim() });
        }
      }

      setAuthMessage('회원가입이 완료되었습니다. 로그인 후 이용해주세요.');
    } catch (error) {
      console.error('회원가입 실패:', error);
      setAuthError(resolveFirebaseError(error));
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const logout = async () => {
    clearFeedback();
    setProcessing(true);
    try {
      await signOutUser();
      setAuthMessage('로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setAuthError(resolveFirebaseError(error));
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const requestPasswordReset = async (email) => {
    clearFeedback();
    if (!email) {
      setAuthError('비밀번호 재설정 메일을 받을 이메일을 입력해주세요.');
      return;
    }
    setProcessing(true);
    try {
      await sendPasswordReset(email);
      setAuthMessage('입력한 이메일 주소로 비밀번호 재설정 메일을 보냈습니다.');
    } catch (error) {
      console.error('비밀번호 재설정 메일 발송 실패:', error);
      setAuthError(resolveFirebaseError(error));
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      hasAdminAccess,
      adminRole,
      canManageGroupbuy: isAdmin || adminRole === 'groupp',
      adminRecord,
      loading,
      processing,
      authError,
      authMessage,
      adminError,
      login,
      register,
      logout,
      requestPasswordReset,
      clearFeedback
    }),
    [
      user,
      isAdmin,
      hasAdminAccess,
      adminRole,
      adminRecord,
      loading,
      processing,
      authError,
      authMessage,
      adminError,
      clearFeedback
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthContext를 찾을 수 없습니다. AuthProvider로 컴포넌트를 감싸주세요.');
  return context;
}
