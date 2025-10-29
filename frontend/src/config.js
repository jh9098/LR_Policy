// frontend/src/config.js
// Render/Express 백엔드를 더 이상 호출하지 않지만, 과거 호환성을 위해 상수를 남겨둔다.
// 현재는 Firestore Web SDK만 사용하므로 API_BASE_URL과 ADMIN_SECRET은 미사용 상태다.
// TODO: 보안 강화를 위해 서버 사이드 백엔드를 다시 도입할 때 이 값을 활용할 수 있다.

const normalize = (url) => url.replace(/\/$/, '');
const envBaseUrl = import.meta.env.VITE_API_BASE_URL ? normalize(import.meta.env.VITE_API_BASE_URL) : null;
const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

export const API_BASE_URL = envBaseUrl || normalize(defaultBaseUrl);
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || '';

// Firebase Web SDK 초기화를 위해서는 다음 Vite 환경 변수를 반드시 설정해야 한다.
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
// VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
