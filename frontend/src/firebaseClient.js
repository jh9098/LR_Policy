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
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from './constants/themeConfig.js';
import { mergeSectionTitles } from './constants/sectionTitleConfig.js';
import { createDefaultSignupFormConfig, normalizeSignupFormConfig } from './constants/signupFormConfig.js';
import { getDefaultCategory, isValidCategory, isValidSubcategory } from './constants/categoryStructure.js';
import { normalizeCoreKeywords } from './utils/draftSerialization.js';
import {
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeParentingGuide,
  normalizeStockGuide
} from './utils/themeDraftDefaults.js';
import { addMinutes, formatKoreanDateTime } from './utils/dateFormat.js';

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

const ISSUE_STATS_COLLECTION = 'issueStats';
const ISSUE_REACTIONS_COLLECTION = 'issueReactions';
const USER_SCRAPS_COLLECTION = 'userScraps';
const TRENDING_SETTINGS_COLLECTION = 'appSettings';
const TRENDING_SETTINGS_DOC_ID = 'trending';
const RESERVATION_SETTINGS_DOC_ID = 'reservationSchedule';
const SECTION_TITLES_DOC_ID = 'sectionTitles';
const SIGNUP_FORM_DOC_ID = 'signupForm';

const FACTORY_SETTINGS_COLLECTION = 'factorySettings';
const FACTORY_DASHBOARD_DOC_ID = 'dashboard';
const FACTORY_TEMPLATE_DOC_ID = 'templates';
const FACTORY_SCHEDULE_DOC_ID = 'schedules';
const FACTORY_SAFETY_DOC_ID = 'safety';
const FACTORY_BALANCE_DOC_ID = 'balance';
const FACTORY_THEME_COLLECTION = 'factoryThemes';
const FACTORY_EXPLORER_COLLECTION = 'factoryExplorer';
const FACTORY_QUEUE_COLLECTION = 'factoryQueue';
const FACTORY_RESULTS_COLLECTION = 'factoryResults';
const FACTORY_LOGS_COLLECTION = 'factoryLogs';

const DEFAULT_TRENDING_SETTINGS = {
  minUpvotes: 5,
  withinHours: 24,
  maxItems: 10
};

const DEFAULT_RESERVATION_INTERVAL_MINUTES = 180;

function normalizeSignupFormDoc(data) {
  const config = normalizeSignupFormConfig(data ?? {});
  return {
    config,
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? ''
  };
}

function normalizeSectionTitlesDoc(data) {
  const titles = mergeSectionTitles(data?.titles ?? {});
  return {
    titles,
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? ''
  };
}

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase 인증 지속성 설정 실패:', error);
});

function createDefaultIssueStats() {
  return {
    upVotes: 0,
    downVotes: 0,
    scrapCount: 0,
    commentCount: 0,
    lastUpvoteAt: null,
    lastDownvoteAt: null,
    lastScrapAt: null,
    lastCommentAt: null
  };
}

function normalizeIssueStats(data) {
  if (!data) {
    return createDefaultIssueStats();
  }
  return {
    upVotes: Number(data.upVotes) || 0,
    downVotes: Number(data.downVotes) || 0,
    scrapCount: Number(data.scrapCount) || 0,
    commentCount: Number(data.commentCount) || 0,
    lastUpvoteAt: data.lastUpvoteAt ?? null,
    lastDownvoteAt: data.lastDownvoteAt ?? null,
    lastScrapAt: data.lastScrapAt ?? null,
    lastCommentAt: data.lastCommentAt ?? null
  };
}

async function ensureIssueStatsDocument(issueId) {
  if (!issueId) return null;
  const statsRef = doc(db, ISSUE_STATS_COLLECTION, issueId);
  const snap = await getDoc(statsRef);
  if (!snap.exists()) {
    await setDoc(
      statsRef,
      {
        ...createDefaultIssueStats(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: false }
    );
  }
  return statsRef;
}

async function getIssueStats(issueId) {
  if (!issueId) {
    return createDefaultIssueStats();
  }
  const statsRef = doc(db, ISSUE_STATS_COLLECTION, issueId);
  const snap = await getDoc(statsRef);
  if (!snap.exists()) {
    return createDefaultIssueStats();
  }
  return normalizeIssueStats(snap.data());
}

async function fetchIssueStatsBatch(issueIds) {
  if (!Array.isArray(issueIds) || issueIds.length === 0) {
    return {};
  }
  const results = await Promise.all(
    issueIds.map(async (issueId) => {
      const stats = await getIssueStats(issueId);
      return [issueId, stats];
    })
  );
  return Object.fromEntries(results);
}

async function attachStatsToIssues(issueList) {
  if (!Array.isArray(issueList) || issueList.length === 0) {
    return [];
  }
  const statsMap = await fetchIssueStatsBatch(issueList.map((issue) => issue.id));
  return issueList.map((issue) => ({
    ...issue,
    stats: statsMap[issue.id] ?? createDefaultIssueStats()
  }));
}

function normalizeCommentSnapshot(docSnap) {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    issueId: data.issueId || '',
    userId: data.userId || '',
    displayName: data.displayName || '',
    email: data.email || '',
    content: data.content || '',
    createdAt: data.createdAt ?? null
  };
}

function normalizeTrendingSettings(data) {
  const base = { ...DEFAULT_TRENDING_SETTINGS };
  if (!data) {
    return base;
  }
  return {
    minUpvotes: Number(data.minUpvotes) >= 0 ? Number(data.minUpvotes) : base.minUpvotes,
    withinHours: Number(data.withinHours) >= 0 ? Number(data.withinHours) : base.withinHours,
    maxItems: Number(data.maxItems) > 0 ? Number(data.maxItems) : base.maxItems
  };
}

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

  let visibleAfter = null;
  if (data?.visibleAfter instanceof Timestamp) {
    visibleAfter = data.visibleAfter.toDate();
  } else if (data?.visibleAfter && typeof data.visibleAfter === 'object' && data.visibleAfter.seconds) {
    visibleAfter = new Date(data.visibleAfter.seconds * 1000);
  }
  const visibilityMode = data?.visibilityMode === 'scheduled' ? 'scheduled' : 'immediate';

  return {
    id: issueId,
    theme,
    easySummary: typeof data?.easySummary === 'string' ? data.easySummary : '',
    title: typeof data?.title === 'string' ? data.title : '',
    date: typeof data?.date === 'string' ? data.date : '',
    groupbuyLink: typeof data?.groupbuyLink === 'string' ? data.groupbuyLink : '',
    category,
    subcategory,
    summaryCard: typeof data?.summaryCard === 'string' ? data.summaryCard : '',
    background: typeof data?.background === 'string' ? data.background : '',
    keyPoints: Array.isArray(data?.keyPoints)
      ? data.keyPoints.map((item) => (typeof item === 'string' ? item : String(item ?? '')))
      : [],
    coreKeywords: normalizeCoreKeywords(data?.coreKeywords),
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
    views: typeof data?.views === 'number' ? data.views : 0,
    visibilityMode,
    visibleAfter
  };
}

function isIssueVisible(issue) {
  if (!issue) return false;
  if (issue.visibilityMode !== 'scheduled') {
    return true;
  }
  if (!(issue.visibleAfter instanceof Date)) {
    return false;
  }
  return issue.visibleAfter.getTime() <= Date.now();
}

function filterVisibleIssues(issues) {
  return issues.filter((item) => isIssueVisible(item));
}

function ensureVisibleAfterValue({ visibilityMode, visibleAfter }) {
  if (visibilityMode !== 'scheduled') {
    return null;
  }
  if (visibleAfter instanceof Timestamp) {
    return visibleAfter;
  }
  if (visibleAfter instanceof Date) {
    return Timestamp.fromDate(visibleAfter);
  }
  if (typeof visibleAfter === 'number') {
    return Timestamp.fromMillis(visibleAfter);
  }
  return null;
}

// 공개 조회 전용. Render 서버를 거치지 않고 Firestore에서 직접 최근 50개의 이슈를 불러온다.
export async function getRecentIssues(limitCount = 50) {
  const now = Timestamp.fromDate(new Date());
  const fetchLimit = Math.max(limitCount * 3, limitCount + 10);

  try {
    const q = query(
      collection(db, 'issues'),
      where('visibleAfter', '<=', now),
      orderBy('visibleAfter', 'desc'),
      limit(fetchLimit)
    );
    const snap = await getDocs(q);
    const baseList = snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
    const visibleList = filterVisibleIssues(baseList).slice(0, limitCount);
    return attachStatsToIssues(visibleList);
  } catch (error) {
    console.warn('가시성 기준 최근 글 조회 실패, 날짜 기준으로 폴백합니다:', error);
    const q = query(collection(db, 'issues'), orderBy('date', 'desc'), limit(fetchLimit));
    const snap = await getDocs(q);
    const baseList = snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
    const visibleList = filterVisibleIssues(baseList).slice(0, limitCount);
    return attachStatsToIssues(visibleList);
  }
}

async function fetchIssuesWithFallback(constraints, { fallbackLimit = 80, fallbackFilter = null } = {}) {
  try {
    const q = query(collection(db, 'issues'), ...constraints);
    const snap = await getDocs(q);
    const baseList = snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
    const visibleList = filterVisibleIssues(baseList);
    return attachStatsToIssues(visibleList);
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
  const fetchLimit = Math.max(limitCount * 3, limitCount + 5);
  const list = await fetchIssuesWithFallback(
    [where('theme', '==', validTheme), orderBy('date', 'desc'), limit(fetchLimit)],
    {
      fallbackLimit: fetchLimit,
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
    const keywordMatches = Array.isArray(issue.coreKeywords)
      ? issue.coreKeywords.some((item) => String(item ?? '').toLowerCase().includes(normalizedKeyword))
      : false;
    if (keywordMatches) {
      return true;
    }
    const haystack = [issue.title, issue.summaryCard, issue.easySummary, issue.background, issue.category, issue.subcategory]
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
export async function getIssueById(issueId, { includeScheduled = false } = {}) {
  if (!issueId) {
    return null;
  }
  const ref = doc(db, 'issues', issueId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  const issue = normalizeIssueData(issueId, snap.data());
  if (!includeScheduled && !isIssueVisible(issue)) {
    return null;
  }
  const stats = await getIssueStats(issueId);
  return { ...issue, stats };
}

// AdminNewPage에서 직접 호출하여 새 문서를 생성한다. Render 서버를 거치지 않는다.
export async function createIssue(issueDraft, { visibilityMode = 'immediate', visibleAfter = null } = {}) {
  const timestamp = serverTimestamp();
  const normalizedVisibleAfter = ensureVisibleAfterValue({ visibilityMode, visibleAfter });
  const docRef = await addDoc(collection(db, 'issues'), {
    ...issueDraft,
    visibilityMode,
    visibleAfter:
      visibilityMode === 'scheduled'
        ? normalizedVisibleAfter ?? Timestamp.fromDate(new Date(Date.now() + 60 * 1000))
        : normalizedVisibleAfter ?? timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    views: 0
  });
  // TODO: 프로덕션에서는 인증 없이 누구나 쓰기를 허용하면 안 된다.
  return docRef.id;
}

// AdminEditPage에서 수정 저장 버튼을 누를 때 호출한다.
export async function updateIssue(issueId, issueDraft, { visibilityMode, visibleAfter } = {}) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  const ref = doc(db, 'issues', issueId);
  const updatePayload = {
    ...issueDraft,
    updatedAt: serverTimestamp()
  };
  if (typeof visibilityMode === 'string') {
    updatePayload.visibilityMode = visibilityMode === 'scheduled' ? 'scheduled' : 'immediate';
  }
  if (visibleAfter !== undefined) {
    updatePayload.visibleAfter = ensureVisibleAfterValue({
      visibilityMode: updatePayload.visibilityMode ?? visibilityMode ?? 'immediate',
      visibleAfter
    });
  }
  await updateDoc(ref, updatePayload);
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

// ----- 댓글 및 사용자 상호작용 유틸 -----

export async function getIssueComments(issueId, { limitCount = 120 } = {}) {
  if (!issueId) {
    return [];
  }
  const commentsQuery = query(
    collection(db, 'issues', issueId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(limitCount)
  );
  const snap = await getDocs(commentsQuery);
  return snap.docs.map((docSnap) => normalizeCommentSnapshot(docSnap));
}

export async function addIssueComment(issueId, { userId, displayName = '', email = '', content }) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  const normalized = (content ?? '').trim();
  if (!normalized) {
    throw new Error('댓글 내용을 입력해주세요.');
  }

  await ensureIssueStatsDocument(issueId);

  const commentsRef = collection(db, 'issues', issueId, 'comments');
  const docRef = await addDoc(commentsRef, {
    issueId,
    userId,
    displayName,
    email,
    content: normalized,
    createdAt: serverTimestamp()
  });

  const statsRef = doc(db, ISSUE_STATS_COLLECTION, issueId);
  const now = serverTimestamp();
  await setDoc(
    statsRef,
    {
      commentCount: increment(1),
      lastCommentAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  const [commentSnap, stats] = await Promise.all([getDoc(docRef), getIssueStats(issueId)]);
  return { comment: normalizeCommentSnapshot(commentSnap), stats };
}

export async function getIssueUserState(issueId, userId) {
  if (!issueId || !userId) {
    return { hasUpvoted: false, hasDownvoted: false, hasScrapped: false };
  }
  const [reactionSnap, scrapSnap] = await Promise.all([
    getDoc(doc(db, ISSUE_REACTIONS_COLLECTION, `${issueId}_${userId}`)),
    getDoc(doc(db, USER_SCRAPS_COLLECTION, userId, 'items', issueId))
  ]);
  const reactionData = reactionSnap.exists() ? reactionSnap.data() : null;
  return {
    hasUpvoted: Boolean(reactionData?.upVoted),
    hasDownvoted: Boolean(reactionData?.downVoted),
    hasScrapped: scrapSnap.exists()
  };
}

export async function submitIssueVote(issueId, { type, userId, isAdmin = false } = {}) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  if (type !== 'up' && type !== 'down') {
    throw new Error('type은 up 또는 down 이어야 합니다.');
  }

  await ensureIssueStatsDocument(issueId);
  const statsRef = doc(db, ISSUE_STATS_COLLECTION, issueId);
  const timestamp = serverTimestamp();

  if (isAdmin) {
    const payload =
      type === 'up'
        ? { upVotes: increment(1), lastUpvoteAt: timestamp, updatedAt: timestamp }
        : { downVotes: increment(1), lastDownvoteAt: timestamp, updatedAt: timestamp };
    await setDoc(statsRef, payload, { merge: true });
    const stats = await getIssueStats(issueId);
    return { stats, userState: { hasUpvoted: false, hasDownvoted: false } };
  }

  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  const reactionRef = doc(db, ISSUE_REACTIONS_COLLECTION, `${issueId}_${userId}`);
  const reactionSnap = await getDoc(reactionRef);
  const reactionData = reactionSnap.exists() ? reactionSnap.data() : {};

  const alreadyPerformed = type === 'up' ? reactionData?.upVoted : reactionData?.downVoted;
  if (alreadyPerformed) {
    throw new Error(type === 'up' ? '이미 추천을 완료했습니다.' : '이미 비추천을 완료했습니다.');
  }

  const reactionPayload = {
    issueId,
    userId,
    updatedAt: timestamp
  };
  if (type === 'up') {
    reactionPayload.upVoted = true;
    reactionPayload.upVotedAt = timestamp;
  } else {
    reactionPayload.downVoted = true;
    reactionPayload.downVotedAt = timestamp;
  }

  await setDoc(reactionRef, reactionPayload, { merge: true });

  const statsPayload =
    type === 'up'
      ? { upVotes: increment(1), lastUpvoteAt: timestamp, updatedAt: timestamp }
      : { downVotes: increment(1), lastDownvoteAt: timestamp, updatedAt: timestamp };
  await setDoc(statsRef, statsPayload, { merge: true });

  const stats = await getIssueStats(issueId);
  const userState = {
    hasUpvoted: Boolean(type === 'up' ? true : reactionData?.upVoted),
    hasDownvoted: Boolean(type === 'down' ? true : reactionData?.downVoted)
  };
  return { stats, userState };
}

export async function toggleIssueScrap(issueId, { userId }) {
  if (!issueId) {
    throw new Error('issueId가 필요합니다.');
  }
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  await ensureIssueStatsDocument(issueId);

  const scrapRef = doc(db, USER_SCRAPS_COLLECTION, userId, 'items', issueId);
  const statsRef = doc(db, ISSUE_STATS_COLLECTION, issueId);
  const snap = await getDoc(scrapRef);

  if (snap.exists()) {
    await deleteDoc(scrapRef);
    const timestamp = serverTimestamp();
    await setDoc(
      statsRef,
      {
        scrapCount: increment(-1),
        updatedAt: timestamp
      },
      { merge: true }
    );
    const stats = await getIssueStats(issueId);
    return { scrapped: false, stats };
  }

  const timestamp = serverTimestamp();
  await setDoc(
    scrapRef,
    {
      issueId,
      userId,
      createdAt: timestamp
    },
    { merge: false }
  );

  await setDoc(
    statsRef,
    {
      scrapCount: increment(1),
      lastScrapAt: timestamp,
      updatedAt: timestamp
    },
    { merge: true }
  );
  const stats = await getIssueStats(issueId);
  return { scrapped: true, stats };
}

export async function getUserScraps(userId, { limitCount = 60 } = {}) {
  if (!userId) {
    return [];
  }
  const scrapsQuery = query(
    collection(db, USER_SCRAPS_COLLECTION, userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(scrapsQuery);
  const items = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const issue = await getIssueById(docSnap.id);
      if (!issue) {
        return null;
      }
      return {
        issue,
        createdAt: docSnap.data()?.createdAt ?? null
      };
    })
  );
  return items.filter(Boolean);
}

export async function getTrendingSettings() {
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, TRENDING_SETTINGS_DOC_ID);
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return { ...DEFAULT_TRENDING_SETTINGS };
  }
  return normalizeTrendingSettings(snap.data());
}

export async function saveTrendingSettings(settings) {
  const normalized = normalizeTrendingSettings(settings);
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, TRENDING_SETTINGS_DOC_ID);
  await setDoc(
    settingsRef,
    {
      ...normalized,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return normalized;
}

export async function getSectionTitles() {
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, SECTION_TITLES_DOC_ID);
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return { titles: mergeSectionTitles(), updatedAt: null, updatedBy: '' };
  }
  return normalizeSectionTitlesDoc(snap.data());
}

export async function saveSectionTitles(titles, { updatedBy } = {}) {
  const normalizedTitles = mergeSectionTitles(titles);
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, SECTION_TITLES_DOC_ID);
  await setDoc(
    settingsRef,
    {
      titles: normalizedTitles,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  return {
    titles: normalizedTitles,
    updatedAt: new Date(),
    updatedBy: updatedBy ?? ''
  };
}

function createDefaultReservationIntervals() {
  const intervals = {};
  THEME_CONFIG.forEach((theme) => {
    intervals[theme.id] = {
      intervalMinutes: DEFAULT_RESERVATION_INTERVAL_MINUTES,
      nextVisibleAt: null
    };
  });
  return intervals;
}

function normalizeReservationSettingsDoc(data) {
  const baseIntervals = createDefaultReservationIntervals();
  const rawIntervals = data?.intervals ?? {};
  THEME_CONFIG.forEach((theme) => {
    const raw = rawIntervals[theme.id] ?? {};
    const intervalMinutes = Number(raw.intervalMinutes);
    let nextVisibleAt = null;
    if (raw.nextVisibleAt instanceof Timestamp) {
      nextVisibleAt = raw.nextVisibleAt.toDate();
    } else if (raw.nextVisibleAt instanceof Date) {
      nextVisibleAt = new Date(raw.nextVisibleAt.getTime());
    } else if (raw.nextVisibleAt && typeof raw.nextVisibleAt === 'object' && raw.nextVisibleAt.seconds) {
      nextVisibleAt = new Date(raw.nextVisibleAt.seconds * 1000);
    }
    baseIntervals[theme.id] = {
      intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes >= 0 ? intervalMinutes : DEFAULT_RESERVATION_INTERVAL_MINUTES,
      nextVisibleAt: nextVisibleAt ?? null
    };
  });
  return {
    intervals: baseIntervals,
    updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data?.updatedAt ?? null,
    updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : ''
  };
}

export async function getReservationSettings() {
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, RESERVATION_SETTINGS_DOC_ID);
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return { intervals: createDefaultReservationIntervals(), updatedAt: null, updatedBy: '' };
  }
  return normalizeReservationSettingsDoc(snap.data());
}

export async function saveReservationSettings(settings, { updatedBy } = {}) {
  const normalized = normalizeReservationSettingsDoc(settings);
  const payloadIntervals = {};
  Object.entries(normalized.intervals).forEach(([themeId, config]) => {
    payloadIntervals[themeId] = {
      intervalMinutes: Number.isFinite(config.intervalMinutes) ? config.intervalMinutes : DEFAULT_RESERVATION_INTERVAL_MINUTES,
      nextVisibleAt: config.nextVisibleAt instanceof Date ? Timestamp.fromDate(config.nextVisibleAt) : null
    };
  });
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, RESERVATION_SETTINGS_DOC_ID);
  await setDoc(
    settingsRef,
    {
      intervals: payloadIntervals,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  return {
    intervals: normalized.intervals,
    updatedAt: new Date(),
    updatedBy: updatedBy ?? ''
  };
}

export async function getScheduledIssues({ includeReleased = false } = {}) {
  try {
    const scheduledQuery = query(collection(db, 'issues'), where('visibilityMode', '==', 'scheduled'));
    const snap = await getDocs(scheduledQuery);
    const items = snap.docs.map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()));
    items.sort((a, b) => {
      const aTime = a.visibleAfter instanceof Date ? a.visibleAfter.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.visibleAfter instanceof Date ? b.visibleAfter.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    if (includeReleased) {
      return items;
    }
    return items.filter((item) => !isIssueVisible(item));
  } catch (error) {
    console.warn('예약된 글 목록 조회 실패, 로컬 필터로 대체합니다:', error);
    const snap = await getDocs(collection(db, 'issues'));
    const items = snap.docs
      .map((docSnap) => normalizeIssueData(docSnap.id, docSnap.data()))
      .filter((item) => item.visibilityMode === 'scheduled');
    items.sort((a, b) => {
      const aTime = a.visibleAfter instanceof Date ? a.visibleAfter.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.visibleAfter instanceof Date ? b.visibleAfter.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    if (includeReleased) {
      return items;
    }
    return items.filter((item) => !isIssueVisible(item));
  }
}

export async function createScheduledIssues(entries, { actor = '' } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }
  const settings = await getReservationSettings();
  const grouped = new Map();
  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || !entry.payload) {
      return;
    }
    const themeId = isValidThemeId(entry.payload.theme) ? entry.payload.theme : DEFAULT_THEME_ID;
    if (!grouped.has(themeId)) {
      grouped.set(themeId, []);
    }
    grouped.get(themeId).push({ ...entry, theme: themeId });
  });

  const scheduledQueue = [];
  const updatedIntervals = { ...settings.intervals };
  const now = new Date();

  grouped.forEach((list, themeId) => {
    const themeEntries = [...list].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const config = updatedIntervals[themeId] ?? {
      intervalMinutes: DEFAULT_RESERVATION_INTERVAL_MINUTES,
      nextVisibleAt: null
    };
    const intervalMinutes = Number.isFinite(config.intervalMinutes) && config.intervalMinutes >= 0
      ? config.intervalMinutes
      : DEFAULT_RESERVATION_INTERVAL_MINUTES;
    let cursor = config.nextVisibleAt instanceof Date ? new Date(config.nextVisibleAt.getTime()) : new Date(now.getTime());
    if (Number.isNaN(cursor.getTime()) || cursor.getTime() < now.getTime()) {
      cursor = new Date(now.getTime());
    }

    themeEntries.forEach((entry) => {
      const visibleAt = new Date(cursor.getTime());
      const formattedDate = formatKoreanDateTime(visibleAt);
      scheduledQueue.push({
        ...entry,
        theme: themeId,
        visibleAt,
        payload: {
          ...entry.payload,
          theme: themeId,
          date: formattedDate
        }
      });
      const advanceMinutes = intervalMinutes > 0 ? intervalMinutes : 1;
      const nextCursor = addMinutes(visibleAt, advanceMinutes);
      cursor = nextCursor ?? addMinutes(visibleAt, 1) ?? new Date(visibleAt.getTime() + 60 * 1000);
    });

    updatedIntervals[themeId] = {
      intervalMinutes,
      nextVisibleAt: cursor
    };
  });

  scheduledQueue.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const created = [];
  for (const entry of scheduledQueue) {
    const visibleTimestamp = Timestamp.fromDate(entry.visibleAt);
    const newId = await createIssue(entry.payload, {
      visibilityMode: 'scheduled',
      visibleAfter: visibleTimestamp
    });
    created.push({
      index: entry.index,
      id: newId,
      theme: entry.theme,
      visibleAt: entry.visibleAt,
      title: entry.payload.title
    });
  }

  await saveReservationSettings({
    intervals: updatedIntervals,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy
  }, { updatedBy: actor });

  return created;
}

export async function getSignupFormSettings() {
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, SIGNUP_FORM_DOC_ID);
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return { config: createDefaultSignupFormConfig(), updatedAt: null, updatedBy: '' };
  }
  return normalizeSignupFormDoc(snap.data());
}

export async function saveSignupFormSettings(config, { updatedBy } = {}) {
  const normalizedConfig = normalizeSignupFormConfig(config ?? {});
  const settingsRef = doc(db, TRENDING_SETTINGS_COLLECTION, SIGNUP_FORM_DOC_ID);
  await setDoc(
    settingsRef,
    {
      ...normalizedConfig,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  return normalizedConfig;
}

export async function getTrendingIssues() {
  const settings = await getTrendingSettings();
  const limitCount = Math.max(settings.maxItems || DEFAULT_TRENDING_SETTINGS.maxItems, 1);
  const fetchLimit = Math.max(limitCount * 3, 20);

  const statsQuery = query(collection(db, ISSUE_STATS_COLLECTION), orderBy('upVotes', 'desc'), limit(fetchLimit));
  const statsSnap = await getDocs(statsQuery);

  const cutoffDate =
    settings.withinHours > 0 ? new Date(Date.now() - settings.withinHours * 60 * 60 * 1000) : null;

  const shortlisted = [];
  statsSnap.forEach((docSnap) => {
    const stats = normalizeIssueStats(docSnap.data());
    if (stats.upVotes < settings.minUpvotes) {
      return;
    }
    if (cutoffDate) {
      const lastUpvote = stats.lastUpvoteAt?.toDate?.() ?? (stats.lastUpvoteAt ? new Date(stats.lastUpvoteAt) : null);
      if (!lastUpvote || lastUpvote < cutoffDate) {
        return;
      }
    }
    shortlisted.push({ issueId: docSnap.id, stats });
  });

  const sliced = shortlisted.slice(0, limitCount);
  const issues = await Promise.all(
    sliced.map(async ({ issueId, stats }) => {
      const issue = await getIssueById(issueId);
      if (!issue) {
        return null;
      }
      return { ...issue, stats };
    })
  );

  return { items: issues.filter(Boolean), settings };
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

// ==============================
// Admin Factory (YouTube Script 공정) 헬퍼
// ==============================

const DEFAULT_FACTORY_DASHBOARD = {
  summary: {
    totalChannels: 0,
    newVideosToday: 0,
    queueSize: 0,
    successCount: 0,
    failureCount: 0,
    lastScanAt: null
  },
  toggles: {
    scan: false,
    extract: false,
    convert: false
  },
  updatedAt: null,
  updatedBy: ''
};

const DEFAULT_FACTORY_SCHEDULES = {
  scanCron: '0 */6 * * *',
  extractCron: '15 */6 * * *',
  convertCron: '30 */6 * * *',
  updatedAt: null,
  updatedBy: ''
};

const DEFAULT_FACTORY_SAFETY = {
  requireReviewBeforePublish: true,
  dailyMaxPerChannel: 3,
  updatedAt: null,
  updatedBy: ''
};

const DEFAULT_FACTORY_BALANCE = {
  progressiveWeight: 50,
  conservativeWeight: 50,
  autoBalanceEnabled: true,
  updatedAt: null,
  updatedBy: ''
};

function toDateSafe(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.warn('Timestamp 변환 실패:', error);
    }
  }
  const parsed = new Date(value);
  // Invalid Date 여부 검사
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toIntegerSafe(value, fallback = 0) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.round(num);
}

function ensureNonNegativeInteger(value, fallback = 0) {
  const int = toIntegerSafe(value, fallback);
  return int < 0 ? fallback : int;
}

function parseIntervalToMinutes(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number.parseInt(trimmed.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    if (trimmed.includes('일')) {
      return numeric * 24 * 60;
    }
    if (trimmed.includes('시간')) {
      return numeric * 60;
    }
    if (trimmed.includes('분')) {
      return numeric;
    }
    return numeric;
  }
  return null;
}

function normalizeFactoryDashboard(data) {
  if (!data) {
    return { ...DEFAULT_FACTORY_DASHBOARD };
  }
  const summary = data.summary ?? {};
  const toggles = data.toggles ?? {};
  return {
    summary: {
      totalChannels: ensureNonNegativeInteger(summary.totalChannels, DEFAULT_FACTORY_DASHBOARD.summary.totalChannels),
      newVideosToday: ensureNonNegativeInteger(summary.newVideosToday, DEFAULT_FACTORY_DASHBOARD.summary.newVideosToday),
      queueSize: ensureNonNegativeInteger(summary.queueSize, DEFAULT_FACTORY_DASHBOARD.summary.queueSize),
      successCount: ensureNonNegativeInteger(summary.successCount, DEFAULT_FACTORY_DASHBOARD.summary.successCount),
      failureCount: ensureNonNegativeInteger(summary.failureCount, DEFAULT_FACTORY_DASHBOARD.summary.failureCount),
      lastScanAt: toDateSafe(summary.lastScanAt)
    },
    toggles: {
      scan: Boolean(toggles.scan),
      extract: Boolean(toggles.extract),
      convert: Boolean(toggles.convert)
    },
    updatedAt: toDateSafe(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : ''
  };
}

function normalizeFactoryChannel(channel) {
  if (!channel || typeof channel !== 'object') {
    return {
      id: '',
      name: '',
      priority: '중간',
      intervalMinutes: 720,
      active: true,
      lastSyncedAt: null,
      note: ''
    };
  }
  const intervalMinutes =
    ensureNonNegativeInteger(channel.intervalMinutes, null) ??
    (typeof channel.intervalHours === 'number'
      ? ensureNonNegativeInteger(channel.intervalHours * 60, 720)
      : parseIntervalToMinutes(channel.interval) ?? 720);
  return {
    id: typeof channel.id === 'string' ? channel.id : '',
    name: typeof channel.name === 'string' ? channel.name : '',
    priority: typeof channel.priority === 'string' ? channel.priority : '중간',
    intervalMinutes,
    active: channel.active !== undefined ? Boolean(channel.active) : true,
    lastSyncedAt: toDateSafe(channel.lastSyncedAt),
    note: typeof channel.note === 'string' ? channel.note : ''
  };
}

const normalizeFactoryKeyword = (value) => (typeof value === 'string' ? value.trim() : '');

function sanitizeKeywordList(list = []) {
  if (!Array.isArray(list)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  list.forEach((value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(trimmed);
  });
  return result;
}

function normalizeFactoryChild(child) {
  if (!child || typeof child !== 'object') {
    return {
      id: '',
      name: '',
      description: '',
      channels: [],
      keywords: []
    };
  }
  return {
    id: typeof child.id === 'string' ? child.id : '',
    name: typeof child.name === 'string' ? child.name : '',
    description: typeof child.description === 'string' ? child.description : '',
    channels: Array.isArray(child.channels) ? child.channels.map(normalizeFactoryChannel) : [],
    keywords: Array.isArray(child.keywords)
      ? child.keywords
          .map(normalizeFactoryKeyword)
          .filter((keyword) => keyword.length > 0)
      : []
  };
}

function normalizeFactoryThemeDoc(data) {
  if (!data || typeof data !== 'object') {
    return { themeId: '', channels: [], keywords: [], groups: [], updatedAt: null, updatedBy: '' };
  }
  return {
    themeId: typeof data.themeId === 'string' ? data.themeId : '',
    channels: Array.isArray(data.channels) ? data.channels.map(normalizeFactoryChannel) : [],
    keywords: Array.isArray(data.keywords)
      ? data.keywords.map(normalizeFactoryKeyword).filter((keyword) => keyword.length > 0)
      : [],
    groups: Array.isArray(data.groups)
      ? data.groups.map((group) => ({
          id: typeof group?.id === 'string' ? group.id : '',
          name: typeof group?.name === 'string' ? group.name : '',
          description: typeof group?.description === 'string' ? group.description : '',
          channels: Array.isArray(group?.channels) ? group.channels.map(normalizeFactoryChannel) : [],
          keywords: Array.isArray(group?.keywords)
            ? group.keywords.map(normalizeFactoryKeyword).filter((keyword) => keyword.length > 0)
            : [],
          children: Array.isArray(group?.children) ? group.children.map(normalizeFactoryChild) : []
        }))
      : [],
    updatedAt: toDateSafe(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : ''
  };
}

function sanitizeFactoryChildForSave(child = {}) {
  return {
    id: typeof child.id === 'string' ? child.id : '',
    name: typeof child.name === 'string' ? child.name : '',
    description: typeof child.description === 'string' ? child.description : '',
    channels: Array.isArray(child.channels) ? child.channels.map(normalizeFactoryChannel) : [],
    keywords: sanitizeKeywordList(child.keywords)
  };
}

function sanitizeFactoryGroupForSave(group = {}) {
  return {
    id: typeof group.id === 'string' ? group.id : '',
    name: typeof group.name === 'string' ? group.name : '',
    description: typeof group.description === 'string' ? group.description : '',
    channels: Array.isArray(group.channels) ? group.channels.map(normalizeFactoryChannel) : [],
    keywords: sanitizeKeywordList(group.keywords),
    children: Array.isArray(group.children) ? group.children.map(sanitizeFactoryChildForSave) : []
  };
}

function normalizeFactoryExplorerDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    themeId: typeof data.themeId === 'string' ? data.themeId : '',
    themeLabel: typeof data.themeLabel === 'string' ? data.themeLabel : '',
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    groupName: typeof data.groupName === 'string' ? data.groupName : '',
    channelId: typeof data.channelId === 'string' ? data.channelId : '',
    channelName: typeof data.channelName === 'string' ? data.channelName : '',
    videoId: typeof data.videoId === 'string' ? data.videoId : '',
    videoTitle: typeof data.videoTitle === 'string' ? data.videoTitle : '',
    thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
    publishedAt: toDateSafe(data.publishedAt),
    durationSeconds: ensureNonNegativeInteger(data.durationSeconds, 0),
    language: typeof data.language === 'string' ? data.language : '',
    hasCaptions: Boolean(data.hasCaptions),
    excluded: Boolean(data.excluded),
    flagged: Boolean(data.flagged),
    discoveredAt: toDateSafe(data.discoveredAt),
    meta: typeof data.meta === 'object' && data.meta ? data.meta : {}
  };
}

function normalizeFactoryQueueDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    themeId: typeof data.themeId === 'string' ? data.themeId : '',
    themeLabel: typeof data.themeLabel === 'string' ? data.themeLabel : '',
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    groupName: typeof data.groupName === 'string' ? data.groupName : '',
    channelId: typeof data.channelId === 'string' ? data.channelId : '',
    channelName: typeof data.channelName === 'string' ? data.channelName : '',
    videoId: typeof data.videoId === 'string' ? data.videoId : '',
    videoTitle: typeof data.videoTitle === 'string' ? data.videoTitle : '',
    publishedAt: toDateSafe(data.publishedAt),
    priority: typeof data.priority === 'string' ? data.priority : '중간',
    status: typeof data.status === 'string' ? data.status : 'pending',
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : '',
    requestedBy: typeof data.requestedBy === 'string' ? data.requestedBy : '',
    createdAt: toDateSafe(data.createdAt),
    startedAt: toDateSafe(data.startedAt),
    updatedAt: toDateSafe(data.updatedAt),
    completedAt: toDateSafe(data.completedAt),
    meta: typeof data.meta === 'object' && data.meta ? data.meta : {}
  };
}

function normalizeFactoryTemplatesDoc(data) {
  const items = data?.items && typeof data.items === 'object' ? data.items : {};
  const normalizedItems = {};
  Object.entries(items).forEach(([themeId, value]) => {
    normalizedItems[themeId] = {
      prompt: typeof value?.prompt === 'string' ? value.prompt : '',
      variables: Array.isArray(value?.variables)
        ? value.variables.filter((item) => typeof item === 'string')
        : [],
      sampleInput: typeof value?.sampleInput === 'string' ? value.sampleInput : ''
    };
  });
  return {
    items: normalizedItems,
    schemaPreview: typeof data?.schemaPreview === 'string' ? data.schemaPreview : '',
    updatedAt: toDateSafe(data?.updatedAt),
    updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : ''
  };
}

function normalizeFactoryResultDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    themeId: typeof data.themeId === 'string' ? data.themeId : '',
    themeLabel: typeof data.themeLabel === 'string' ? data.themeLabel : '',
    groupName: typeof data.groupName === 'string' ? data.groupName : '',
    channelId: typeof data.channelId === 'string' ? data.channelId : '',
    channelName: typeof data.channelName === 'string' ? data.channelName : '',
    title: typeof data.title === 'string' ? data.title : '',
    summary: typeof data.summary === 'string' ? data.summary : '',
    jsonLine: typeof data.jsonLine === 'string' ? data.jsonLine : '',
    threadsSummary: typeof data.threadsSummary === 'string' ? data.threadsSummary : '',
    transcript: typeof data.transcript === 'string' ? data.transcript : '',
    tokens: ensureNonNegativeInteger(data.tokens, 0),
    status: typeof data.status === 'string' ? data.status : 'success',
    completedAt: toDateSafe(data.completedAt),
    createdAt: toDateSafe(data.createdAt),
    meta: typeof data.meta === 'object' && data.meta ? data.meta : {}
  };
}

function normalizeFactoryLogDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    level: typeof data.level === 'string' ? data.level : 'info',
    message: typeof data.message === 'string' ? data.message : '',
    context: typeof data.context === 'string' ? data.context : '',
    phase: typeof data.phase === 'string' ? data.phase : '',
    createdAt: toDateSafe(data.createdAt)
  };
}

function normalizeFactorySchedulesDoc(data) {
  if (!data) {
    return { ...DEFAULT_FACTORY_SCHEDULES };
  }
  return {
    scanCron: typeof data.scanCron === 'string' ? data.scanCron : DEFAULT_FACTORY_SCHEDULES.scanCron,
    extractCron: typeof data.extractCron === 'string' ? data.extractCron : DEFAULT_FACTORY_SCHEDULES.extractCron,
    convertCron: typeof data.convertCron === 'string' ? data.convertCron : DEFAULT_FACTORY_SCHEDULES.convertCron,
    updatedAt: toDateSafe(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : ''
  };
}

function normalizeFactorySafetyDoc(data) {
  if (!data) {
    return { ...DEFAULT_FACTORY_SAFETY };
  }
  return {
    requireReviewBeforePublish:
      data.requireReviewBeforePublish !== undefined
        ? Boolean(data.requireReviewBeforePublish)
        : DEFAULT_FACTORY_SAFETY.requireReviewBeforePublish,
    dailyMaxPerChannel: ensureNonNegativeInteger(
      data.dailyMaxPerChannel,
      DEFAULT_FACTORY_SAFETY.dailyMaxPerChannel
    ),
    updatedAt: toDateSafe(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : ''
  };
}

function normalizeFactoryBalanceDoc(data) {
  if (!data) {
    return { ...DEFAULT_FACTORY_BALANCE };
  }
  const progressiveWeight = ensureNonNegativeInteger(
    data.progressiveWeight,
    DEFAULT_FACTORY_BALANCE.progressiveWeight
  );
  const conservativeWeight = ensureNonNegativeInteger(
    data.conservativeWeight,
    DEFAULT_FACTORY_BALANCE.conservativeWeight
  );
  const sum = progressiveWeight + conservativeWeight;
  return {
    progressiveWeight,
    conservativeWeight,
    autoBalanceEnabled:
      data.autoBalanceEnabled !== undefined
        ? Boolean(data.autoBalanceEnabled)
        : DEFAULT_FACTORY_BALANCE.autoBalanceEnabled,
    updatedAt: toDateSafe(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
    totalWeight: sum > 0 ? sum : 100
  };
}

function minutesToCronLabel(minutes) {
  if (!minutes || minutes <= 0) {
    return '알수없음';
  }
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days}일`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}시간`;
  }
  return `${minutes}분`;
}

export function formatFactoryInterval(minutes) {
  return minutesToCronLabel(minutes);
}

// ------------------------------
// Dashboard & Quick Toggles
// ------------------------------

export async function getFactoryDashboard() {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_DASHBOARD_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...DEFAULT_FACTORY_DASHBOARD };
  }
  return normalizeFactoryDashboard(snap.data());
}

export async function updateFactoryDashboard(updates = {}) {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_DASHBOARD_DOC_ID);
  const payload = {};
  if (updates.summary) {
    const summary = updates.summary;
    payload.summary = {
      totalChannels: ensureNonNegativeInteger(summary.totalChannels, undefined),
      newVideosToday: ensureNonNegativeInteger(summary.newVideosToday, undefined),
      queueSize: ensureNonNegativeInteger(summary.queueSize, undefined),
      successCount: ensureNonNegativeInteger(summary.successCount, undefined),
      failureCount: ensureNonNegativeInteger(summary.failureCount, undefined),
      lastScanAt: summary.lastScanAt instanceof Date ? Timestamp.fromDate(summary.lastScanAt) : summary.lastScanAt || null
    };
  }
  if (updates.toggles) {
    payload.toggles = {
      scan: Boolean(updates.toggles.scan),
      extract: Boolean(updates.toggles.extract),
      convert: Boolean(updates.toggles.convert)
    };
  }
  if (updates.updatedBy) {
    payload.updatedBy = updates.updatedBy;
  }
  payload.updatedAt = serverTimestamp();
  await setDoc(ref, payload, { merge: true });
  return getFactoryDashboard();
}

// ------------------------------
// Theme & Channel Tree
// ------------------------------

export async function getFactoryThemeConfigs() {
  const col = collection(db, FACTORY_THEME_COLLECTION);
  const snap = await getDocs(col);
  const result = {};
  snap.forEach((docSnap) => {
    result[docSnap.id] = normalizeFactoryThemeDoc(docSnap.data());
  });
  return result;
}

export async function saveFactoryThemeConfig(themeId, config, { updatedBy } = {}) {
  if (!themeId) {
    throw new Error('themeId가 필요합니다.');
  }
  const ref = doc(db, FACTORY_THEME_COLLECTION, themeId);
  const payload = {
    themeId,
    channels: Array.isArray(config?.channels) ? config.channels.map(normalizeFactoryChannel) : [],
    keywords: sanitizeKeywordList(config?.keywords),
    groups: Array.isArray(config?.groups) ? config.groups.map(sanitizeFactoryGroupForSave) : [],
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? ''
  };
  await setDoc(ref, payload, { merge: false });
  const snap = await getDoc(ref);
  return normalizeFactoryThemeDoc(snap.data());
}

// ------------------------------
// Explorer 목록
// ------------------------------

export async function getFactoryExplorerItems({ limitCount = 60 } = {}) {
  const explorerQuery = query(
    collection(db, FACTORY_EXPLORER_COLLECTION),
    orderBy('publishedAt', 'desc'),
    limit(Math.max(limitCount, 20))
  );
  const snap = await getDocs(explorerQuery);
  return snap.docs.map(normalizeFactoryExplorerDoc);
}

export async function updateFactoryExplorerItem(id, updates = {}) {
  if (!id) {
    throw new Error('Explorer 문서 id가 필요합니다.');
  }
  const ref = doc(db, FACTORY_EXPLORER_COLLECTION, id);
  const payload = { ...updates };
  if (updates.publishedAt instanceof Date) {
    payload.publishedAt = Timestamp.fromDate(updates.publishedAt);
  }
  if (updates.discoveredAt instanceof Date) {
    payload.discoveredAt = Timestamp.fromDate(updates.discoveredAt);
  }
  payload.updatedAt = serverTimestamp();
  await setDoc(ref, payload, { merge: true });
  const snap = await getDoc(ref);
  return normalizeFactoryExplorerDoc(snap);
}

export async function upsertFactoryExplorerItems(items = [], { discoveredBy = '' } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return { created: 0, updated: 0 };
  }
  let created = 0;
  let updated = 0;
  await Promise.all(
    items.map(async (item) => {
      const docId = typeof item.id === 'string' && item.id ? item.id : item.videoId;
      if (!docId) return;
      const ref = doc(db, FACTORY_EXPLORER_COLLECTION, docId);
      const snap = await getDoc(ref);
      const existed = snap.exists();
      const existingData = existed ? snap.data() : {};
      const baseMeta =
        existingData && typeof existingData.meta === 'object' && existingData.meta ? existingData.meta : {};
      const payload = {
        themeId: typeof item.themeId === 'string' ? item.themeId : existingData?.themeId || '',
        themeLabel: typeof item.themeLabel === 'string' ? item.themeLabel : existingData?.themeLabel || '',
        groupId: typeof item.groupId === 'string' ? item.groupId : existingData?.groupId || '',
        groupName: typeof item.groupName === 'string' ? item.groupName : existingData?.groupName || '',
        channelId: typeof item.channelId === 'string' ? item.channelId : existingData?.channelId || '',
        channelName: typeof item.channelName === 'string' ? item.channelName : existingData?.channelName || '',
        videoId: typeof item.videoId === 'string' ? item.videoId : existingData?.videoId || docId,
        videoTitle: typeof item.videoTitle === 'string' ? item.videoTitle : existingData?.videoTitle || '',
        thumbnail: typeof item.thumbnail === 'string' ? item.thumbnail : existingData?.thumbnail || '',
        durationSeconds: ensureNonNegativeInteger(item.durationSeconds, existingData?.durationSeconds ?? 0),
        language: typeof item.language === 'string' ? item.language : existingData?.language || '',
        hasCaptions: item.hasCaptions !== undefined ? Boolean(item.hasCaptions) : Boolean(existingData?.hasCaptions),
        updatedAt: serverTimestamp(),
        meta: {
          ...baseMeta,
          ...(typeof item.meta === 'object' && item.meta ? item.meta : {}),
          lastDiscoveredBy: discoveredBy
        }
      };
      if (item.publishedAt instanceof Date) {
        payload.publishedAt = Timestamp.fromDate(item.publishedAt);
      } else if (item.publishedAt) {
        payload.publishedAt = item.publishedAt;
      }
      if (!existed) {
        payload.discoveredAt = serverTimestamp();
      }
      await setDoc(ref, payload, { merge: true });
      if (existed) updated += 1;
      else created += 1;
    })
  );
  return { created, updated };
}

export async function addFactoryQueueItems(items = [], { requestedBy = '' } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const created = await Promise.all(
    items.map(async (item) => {
      const ref = await addDoc(collection(db, FACTORY_QUEUE_COLLECTION), {
        themeId: item.themeId ?? '',
        themeLabel: item.themeLabel ?? '',
        groupId: item.groupId ?? '',
        groupName: item.groupName ?? '',
        channelId: item.channelId ?? '',
        channelName: item.channelName ?? '',
        videoId: item.videoId ?? '',
        videoTitle: item.videoTitle ?? '',
        publishedAt:
          item.publishedAt instanceof Date
            ? Timestamp.fromDate(item.publishedAt)
            : item.publishedAt ?? null,
        priority: item.priority ?? '중간',
        status: item.status ?? 'pending',
        meta: item.meta ?? {},
        requestedBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const snap = await getDoc(ref);
      return normalizeFactoryQueueDoc(snap);
    })
  );
  return created;
}

// ------------------------------
// Queue 관리
// ------------------------------

export async function getFactoryQueueItems({ limitCount = 80 } = {}) {
  const queueQuery = query(
    collection(db, FACTORY_QUEUE_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(Math.max(limitCount, 20))
  );
  const snap = await getDocs(queueQuery);
  return snap.docs.map(normalizeFactoryQueueDoc);
}

export async function updateFactoryQueueItems(ids = [], updates = {}) {
  const validIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (validIds.length === 0) {
    return [];
  }
  const payload = { ...updates, updatedAt: serverTimestamp() };
  if (updates.startedAt instanceof Date) {
    payload.startedAt = Timestamp.fromDate(updates.startedAt);
  } else if (updates.startedAt === 'now') {
    payload.startedAt = serverTimestamp();
  }
  if (updates.completedAt instanceof Date) {
    payload.completedAt = Timestamp.fromDate(updates.completedAt);
  } else if (updates.completedAt === 'now') {
    payload.completedAt = serverTimestamp();
  }
  await Promise.all(validIds.map((id) => setDoc(doc(db, FACTORY_QUEUE_COLLECTION, id), payload, { merge: true })));
  return getFactoryQueueItems({ limitCount: validIds.length + 20 });
}

export async function deleteFactoryQueueItems(ids = []) {
  const validIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  await Promise.all(validIds.map((id) => deleteDoc(doc(db, FACTORY_QUEUE_COLLECTION, id))));
  return validIds.length;
}

// ------------------------------
// 템플릿 & 스키마
// ------------------------------

export async function getFactoryTemplates() {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_TEMPLATE_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return normalizeFactoryTemplatesDoc({});
  }
  return normalizeFactoryTemplatesDoc(snap.data());
}

export async function saveFactoryTemplate(themeId, template, { schemaPreview, updatedBy } = {}) {
  if (!themeId) {
    throw new Error('themeId가 필요합니다.');
  }
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_TEMPLATE_DOC_ID);
  const payload = {
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? ''
  };
  if (schemaPreview !== undefined) {
    payload.schemaPreview = schemaPreview;
  }
  payload[`items.${themeId}`] = {
    prompt: typeof template?.prompt === 'string' ? template.prompt : '',
    variables: Array.isArray(template?.variables)
      ? template.variables.filter((item) => typeof item === 'string')
      : [],
    sampleInput: typeof template?.sampleInput === 'string' ? template.sampleInput : ''
  };
  await setDoc(ref, payload, { merge: true });
  const snap = await getDoc(ref);
  return normalizeFactoryTemplatesDoc(snap.data());
}

// ------------------------------
// 결과 & 로그
// ------------------------------

export async function getFactoryResults({ limitCount = 60 } = {}) {
  const resultsQuery = query(
    collection(db, FACTORY_RESULTS_COLLECTION),
    orderBy('completedAt', 'desc'),
    limit(Math.max(limitCount, 20))
  );
  const snap = await getDocs(resultsQuery);
  return snap.docs.map(normalizeFactoryResultDoc);
}

export async function getFactoryLogs({ limitCount = 200 } = {}) {
  const logsQuery = query(
    collection(db, FACTORY_LOGS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(Math.max(limitCount, 50))
  );
  const snap = await getDocs(logsQuery);
  return snap.docs.map(normalizeFactoryLogDoc);
}

// ------------------------------
// 빠른 설정 (스케줄/안전/정치균형)
// ------------------------------

export async function getFactorySchedules() {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_SCHEDULE_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...DEFAULT_FACTORY_SCHEDULES };
  }
  return normalizeFactorySchedulesDoc(snap.data());
}

export async function saveFactorySchedules(values, { updatedBy } = {}) {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_SCHEDULE_DOC_ID);
  await setDoc(
    ref,
    {
      scanCron: typeof values?.scanCron === 'string' ? values.scanCron : DEFAULT_FACTORY_SCHEDULES.scanCron,
      extractCron:
        typeof values?.extractCron === 'string' ? values.extractCron : DEFAULT_FACTORY_SCHEDULES.extractCron,
      convertCron:
        typeof values?.convertCron === 'string' ? values.convertCron : DEFAULT_FACTORY_SCHEDULES.convertCron,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return normalizeFactorySchedulesDoc(snap.data());
}

export async function getFactorySafetyOptions() {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_SAFETY_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...DEFAULT_FACTORY_SAFETY };
  }
  return normalizeFactorySafetyDoc(snap.data());
}

export async function saveFactorySafetyOptions(values, { updatedBy } = {}) {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_SAFETY_DOC_ID);
  await setDoc(
    ref,
    {
      requireReviewBeforePublish:
        values?.requireReviewBeforePublish !== undefined
          ? Boolean(values.requireReviewBeforePublish)
          : DEFAULT_FACTORY_SAFETY.requireReviewBeforePublish,
      dailyMaxPerChannel: ensureNonNegativeInteger(
        values?.dailyMaxPerChannel,
        DEFAULT_FACTORY_SAFETY.dailyMaxPerChannel
      ),
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return normalizeFactorySafetyDoc(snap.data());
}

export async function getFactoryBalanceSettings() {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_BALANCE_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...DEFAULT_FACTORY_BALANCE, totalWeight: 100 };
  }
  return normalizeFactoryBalanceDoc(snap.data());
}

export async function saveFactoryBalanceSettings(values, { updatedBy } = {}) {
  const ref = doc(db, FACTORY_SETTINGS_COLLECTION, FACTORY_BALANCE_DOC_ID);
  const progressiveWeight = ensureNonNegativeInteger(
    values?.progressiveWeight,
    DEFAULT_FACTORY_BALANCE.progressiveWeight
  );
  const conservativeWeight = ensureNonNegativeInteger(
    values?.conservativeWeight,
    DEFAULT_FACTORY_BALANCE.conservativeWeight
  );
  await setDoc(
    ref,
    {
      progressiveWeight,
      conservativeWeight,
      autoBalanceEnabled:
        values?.autoBalanceEnabled !== undefined
          ? Boolean(values.autoBalanceEnabled)
          : DEFAULT_FACTORY_BALANCE.autoBalanceEnabled,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? ''
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return normalizeFactoryBalanceDoc(snap.data());
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
