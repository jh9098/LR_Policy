// frontend/src/firebaseClient.js
// !!! 매우 중요 !!!
// 지금은 개발 단계라서 Firestore Security Rules에서 issues 컬렉션에 대해 read/write 모두 allow true; 로 열어둔다고 가정한다.
// 즉 누구나 /admin 페이지에서 문서를 생성/수정/삭제할 수 있다.
// 프로덕션에서는 절대 이렇게 두면 안 된다. TODO: 보안 규칙을 잠그고 인증을 붙여야 한다.
// (예시 규칙 - 실제 콘솔에 수동 반영 필요)
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{db}/documents {
//     match /issues/{docId} {
//       allow read: if true;      // 현재는 누구나 읽기 허용
//       allow write: if true;     // 현재는 누구나 쓰기 허용 (DEV ONLY)
//     }
//     match /metrics/{issueId} {
//       allow read: if true;
//       allow write: if true;     // DEV ONLY
//     }
//   }
// }

// 이 파일은 브라우저 전용 Firebase Web SDK 초기화와 CRUD 유틸을 단일 진실(Single Source of Truth)로 제공한다.
// Render/Express 백엔드는 현재 전혀 호출하지 않으며, 모든 데이터 흐름이 "프론트 → Firestore" 직행 구조임을 명심해야 한다.

import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from './constants/themeConfig.js';
import { getDefaultCategory, isValidCategory, isValidSubcategory } from './constants/categoryStructure.js';
import {
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeParentingGuide,
  normalizeStockGuide
} from './utils/themeDraftDefaults.js';

// Vite 환경 변수 기반 Firebase 설정을 구성한다.
// Netlify 등 배포 환경에서도 동일한 키 이름(VITE_FIREBASE_*)으로 등록해야 한다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase 앱을 초기화하고 Firestore 인스턴스를 공유한다.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase 인증 지속성 설정 실패:', error);
});

export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInUserWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerUserWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function updateAuthProfile(user, profile) {
  return updateProfile(user, profile);
}

export async function saveUserProfile(uid, profile) {
  if (!uid) return;
  await setDoc(doc(db, 'userProfiles', uid), profile, { merge: true });
}

export async function getAdminRole(uid) {
  if (!uid) return null;
  const adminRef = doc(db, 'admins', uid);
  const snap = await getDoc(adminRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getStaticPageContent(slug) {
  if (!slug) return null;
  const pageRef = doc(db, 'staticPages', slug);
  const snap = await getDoc(pageRef);
  if (!snap.exists()) {
    return { id: slug, title: '', content: '', updatedAt: null, updatedBy: '' };
  }
  return { id: slug, ...snap.data() };
}

export async function saveStaticPageContent(slug, { title = '', content = '', updatedBy = '' } = {}) {
  if (!slug) throw new Error('slug is required to save static page content.');
  const pageRef = doc(db, 'staticPages', slug);
  const payload = {
    title: typeof title === 'string' ? title : '',
    content: typeof content === 'string' ? content : '',
    updatedBy: typeof updatedBy === 'string' ? updatedBy : '',
    updatedAt: serverTimestamp()
  };

  await setDoc(pageRef, payload, { merge: true });

  try {
    await addDoc(collection(pageRef, 'history'), {
      title: payload.title,
      content: payload.content,
      updatedBy: payload.updatedBy,
      savedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('정적 페이지 변경 이력 저장에 실패했습니다:', error);
  }
}

export async function getStaticPageHistory(slug, limitCount = 10) {
  if (!slug) return [];
  const pageRef = doc(db, 'staticPages', slug);
  const historyQuery = query(collection(pageRef, 'history'), orderBy('savedAt', 'desc'), limit(limitCount));
  const snap = await getDocs(historyQuery);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// 내부에서 사용하는 헬퍼: Firestore 문서를 issueDraft 스키마에 맞는 평범한 객체로 정규화한다.
function normalizeIssueData(issueId, data) {
  // Firestore에서 특정 필드가 누락된 경우에도 UI가 안전하게 동작하도록 기본값을 강제한다.
  const theme = typeof data?.theme === 'string' && isValidThemeId(data.theme) ? data.theme : DEFAULT_THEME_ID;
  const defaultCategory = getDefaultCategory(theme);
  const category =
    typeof data?.category === 'string' && isValidCategory(theme, data.category) ? data.category : defaultCategory;
  const subcategory =
    typeof data?.subcategory === 'string' && isValidSubcategory(theme, category, data.subcategory)
      ? data.subcategory
      : '';

  return {
    id: issueId,
    theme,
    easySummary: typeof data?.easySummary === 'string' ? data.easySummary : '',
    title: typeof data?.title === 'string' ? data.title : '',
    date: typeof data?.date === 'string' ? data.date : '',
    category,
    subcategory,
    summaryCard: typeof data?.summaryCard === 'string' ? data.summaryCard : '',
    background: typeof data?.background === 'string' ? data.background : '',
    keyPoints: Array.isArray(data?.keyPoints)
      ? data.keyPoints.map((item) => (typeof item === 'string' ? item : String(item ?? '')))
      : [],
    progressiveView: data?.progressiveView ?? null,
    conservativeView: data?.conservativeView ?? null,
    impactToLife: data?.impactToLife ?? null,
    sources: Array.isArray(data?.sources)
      ? data.sources.map((source) => ({
          type: typeof source?.type === 'string' ? source.type : 'etc',
          channelName: typeof source?.channelName === 'string' ? source.channelName : '',
          sourceDate: typeof source?.sourceDate === 'string' ? source.sourceDate : '',
          timestamp: typeof source?.timestamp === 'string' ? source.timestamp : '',
          note: typeof source?.note === 'string' ? source.note : ''
        }))
      : [],
    parentingGuide: normalizeParentingGuide(data?.parentingGuide, { withPresets: true }),
    healthGuide: normalizeHealthGuide(data?.healthGuide, { withPresets: true }),
    lifestyleGuide: normalizeLifestyleGuide(data?.lifestyleGuide),
    stockGuide: normalizeStockGuide(data?.stockGuide),
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
    views: typeof data?.views === 'number' ? data.views : 0
  };
}

// 공개 조회 전용. Render 서버를 거치지 않고 Firestore에서 직접 최근 50개의 이슈를 불러온다.
export async function getRecentIssues(limitCount = 50) {
  const q = query(collection(db, 'issues'), orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
}

async function fetchIssuesWithFallback(constraints, { fallbackLimit = 80, fallbackFilter = null } = {}) {
  try {
    const q = query(collection(db, 'issues'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
  } catch (error) {
    console.warn('Firestore 고급 쿼리 실패, 최신 순 결과로 폴백합니다:', error);
    const fallbackList = await getRecentIssues(fallbackLimit);
    if (typeof fallbackFilter === 'function') {
      return fallbackList.filter(fallbackFilter);
    }
    return fallbackList;
  }
}

export async function getTopIssuesByTheme(themeId, limitCount = 10) {
  const validTheme = isValidThemeId(themeId) ? themeId : DEFAULT_THEME_ID;
  const list = await fetchIssuesWithFallback(
    [where('theme', '==', validTheme), orderBy('date', 'desc'), limit(limitCount)],
    {
      fallbackLimit: limitCount * 4,
      fallbackFilter: (issue) => issue.theme === validTheme
    }
  );
  return list.slice(0, limitCount);
}

const SORT_OPTION_MAP = {
  recent: { field: 'date', direction: 'desc' },
  popular: { field: 'views', direction: 'desc' },
  title: { field: 'title', direction: 'asc' }
};

export async function getIssuesByTheme(themeId, { sort = 'recent', limitCount = 60 } = {}) {
  const validTheme = isValidThemeId(themeId) ? themeId : DEFAULT_THEME_ID;
  const sortOption = SORT_OPTION_MAP[sort] ?? SORT_OPTION_MAP.recent;
  const constraints = [where('theme', '==', validTheme), orderBy(sortOption.field, sortOption.direction), limit(limitCount)];
  const fallbackFilter = (issue) => issue.theme === validTheme;
  const results = await fetchIssuesWithFallback(constraints, {
    fallbackLimit: limitCount * 4,
    fallbackFilter
  });

  if (sortOption.field === 'title') {
    return [...results].sort((a, b) => a.title.localeCompare(b.title, 'ko')); // Firestore는 문자열 정렬이 제한적이라 안전장치
  }
  if (sortOption.field === 'views') {
    return [...results].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  }
  return results;
}

export async function searchIssuesByTheme(themeId, keyword, { limitCount = 80, sort = 'recent' } = {}) {
  const normalizedKeyword = (keyword ?? '').trim().toLowerCase();
  const baseList = await getIssuesByTheme(themeId, { sort, limitCount });
  if (!normalizedKeyword) {
    return baseList;
  }
  return baseList.filter((issue) => {
    const haystack = [issue.title, issue.summaryCard, issue.easySummary, issue.background]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
}

export async function searchIssuesAcrossThemes(keyword, { limitPerTheme = 40, sort = 'recent' } = {}) {
  const entries = await Promise.all(
    THEME_CONFIG.map(async (theme) => ({
      themeId: theme.id,
      items: await searchIssuesByTheme(theme.id, keyword, { limitCount: limitPerTheme, sort })
    }))
  );
  return entries.reduce((acc, { themeId, items }) => {
    acc[themeId] = items;
    return acc;
  }, {});
}

// 상세 페이지나 /admin/edit/:id 페이지에서 단일 문서를 조회할 때 사용한다.
export async function getIssueById(issueId) {
  if (!issueId) {
    return null;
  }
  const ref = doc(db, 'issues', issueId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return normalizeIssueData(issueId, snap.data());
}

// AdminNewPage에서 직접 호출하여 새 문서를 생성한다. Render 서버를 거치지 않는다.
export async function createIssue(issueDraft) {
  const docRef = await addDoc(collection(db, 'issues'), {
    ...issueDraft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0
  });
  // TODO: 프로덕션에서는 인증 없이 누구나 쓰기를 허용하면 안 된다.
  return docRef.id;
}

// AdminEditPage에서 수정 저장 버튼을 누를 때 호출한다.
export async function updateIssue(issueId, issueDraft) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  const ref = doc(db, 'issues', issueId);
  await updateDoc(ref, {
    ...issueDraft,
    updatedAt: serverTimestamp()
  });
}

// AdminListPage나 AdminEditPage에서 삭제 버튼을 누르면 Firestore 문서를 직접 삭제한다.
export async function deleteIssue(issueId) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  await deleteDoc(doc(db, 'issues', issueId));
  // metrics 서브 컬렉션(조회수 등)을 별도로 관리하고 있다면 같이 제거한다.
  await deleteDoc(doc(db, 'metrics', issueId)).catch(() => {
    // metrics 문서가 없을 수도 있으므로 오류를 삼킨다.
  });
}

// 간단한 클라이언트 측 검색 도우미. Firestore에서 최근 N개를 가져온 뒤 제목/카테고리/요약을 부분 일치로 필터한다.
export async function searchIssuesClient(keyword, limitCount = 50) {
  const normalizedKeyword = (keyword ?? '').trim().toLowerCase();
  const baseList = await getRecentIssues(limitCount);
  if (!normalizedKeyword) {
    return baseList;
  }
  return baseList.filter((issue) => {
    const haystack = [issue.title, issue.summaryCard, issue.easySummary, issue.category, issue.subcategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
}

// TODO: 조회수(metrics) 추적을 원한다면 아래 예시처럼 클라이언트에서 직접 setDoc + increment를 호출하는 방식을 추가로 구현할 수 있다.
// import { increment, setDoc } from 'firebase/firestore';
// export async function incrementView(issueId) {
//   await setDoc(
//     doc(db, 'metrics', issueId),
//     { views: increment(1), lastViewedAt: serverTimestamp() },
//     { merge: true }
//   );
// }

export { db };
