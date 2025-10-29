// frontend/src/config.js
// Render/Express 백엔드를 호출하던 시절의 설정을 유지하되, 현재는 Firestore 직행 구조라 사용하지 않는다.
// TODO: 향후 서버를 다시 사용할 때를 대비해 값은 남겨두지만, 지금은 참고용 주석만 제공한다.

const normalize = (url) => url.replace(/\/$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL ? normalize(import.meta.env.VITE_API_BASE_URL) : null;
const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

// 현재는 API_BASE_URL을 쓰지 않는다. Firebase Web SDK만 사용한다.
export const API_BASE_URL = envBaseUrl || normalize(defaultBaseUrl);

// ADMIN_SECRET 역시 현재는 사용하지 않는다. Firestore Security Rules가 완전히 열려 있기 때문이다.
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || '';

// Firebase 관련 환경 변수는 Vite 규칙에 따라 import.meta.env.VITE_FIREBASE_* 로 전달해야 한다.
// 예: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
//     VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
