// frontend/src/config.js
const normalize = (url) => url.replace(/\/$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL
  ? normalize(import.meta.env.VITE_API_BASE_URL)
  : null;

const defaultBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : '/api';

export const API_BASE_URL = envBaseUrl || normalize(defaultBaseUrl);
