import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext.jsx';
import AuthModal from '../components/AuthModal.jsx';

const AuthDialogContext = createContext({
  openLogin: () => {},
  closeLogin: () => {},
  requireAuth: () => false
});

export function AuthDialogProvider({ children }) {
  const { user, processing } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const pendingActionRef = useRef(null);

  const closeLogin = useCallback(() => {
    if (processing) {
      return;
    }
    setOpen(false);
    setReason('');
    pendingActionRef.current = null;
  }, [processing]);

  const openLogin = useCallback(({ message = '', onSuccess = null } = {}) => {
    setReason(message);
    pendingActionRef.current = typeof onSuccess === 'function' ? onSuccess : null;
    setOpen(true);
  }, []);

  const requireAuth = useCallback(
    (action, { message = '로그인 후 이용할 수 있는 기능입니다.' } = {}) => {
      if (user) {
        action?.();
        return true;
      }
      pendingActionRef.current = typeof action === 'function' ? action : null;
      setReason(message);
      setOpen(true);
      return false;
    },
    [user]
  );

  useEffect(() => {
    if (user && pendingActionRef.current) {
      const callback = pendingActionRef.current;
      pendingActionRef.current = null;
      setOpen(false);
      setReason('');
      Promise.resolve().then(() => callback?.());
    }
  }, [user]);

  const value = useMemo(
    () => ({
      openLogin,
      closeLogin,
      requireAuth
    }),
    [openLogin, closeLogin, requireAuth]
  );

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <AuthModal open={open} reason={reason} onClose={closeLogin} />
    </AuthDialogContext.Provider>
  );
}

AuthDialogProvider.propTypes = {
  children: PropTypes.node
};

export function useAuthDialog() {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) {
    throw new Error('useAuthDialog는 AuthDialogProvider 내부에서만 사용할 수 있습니다.');
  }
  return ctx;
}
