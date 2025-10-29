// frontend/src/firebase/client.js
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

function readFirebaseConfig() {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !import.meta.env[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Firebase 환경 변수가 누락되었습니다: ${missingKeys.join(', ')}. ` +
        'Netlify 또는 로컬 .env 파일에 각 값을 설정해주세요.'
    );
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
}

let firebaseApp;

export function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length > 0) {
    firebaseApp = getApp();
    return firebaseApp;
  }

  firebaseApp = initializeApp(readFirebaseConfig());
  return firebaseApp;
}

export function getFirestoreClient() {
  return getFirestore(getFirebaseApp());
}
