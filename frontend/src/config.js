// frontend/src/config.js
const normalize = (url) => url.replace(/\/$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL
  ? normalize(import.meta.env.VITE_API_BASE_URL)
  : null;

const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

export const API_BASE_URL = envBaseUrl || normalize(defaultBaseUrl);

// TODO: 실서비스에서는 이 값으로 인증을 구현할 예정이지만, 지금은 개발 편의를 위해 비워두어도 동작하게 만든다.
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || '';
