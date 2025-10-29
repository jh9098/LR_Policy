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

// 브라우저에서 Firebase Web SDK를 활용해 Firestore를 직접 초기화하고 CRUD를 수행하는 단일 진실 소스이다.
// Render 백엔드 서버는 더 이상 호출하지 않으며, 모든 데이터 흐름은 프론트 → Firestore 직행 구조다.
// TODO(프로덕션): 인증과 보안 규칙 강화를 통해 누구나 쓰기를 막아야 한다.

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

// Firebase 프로젝트 환경변수는 Vite의 import.meta.env를 통해 주입된다.
// Netlify 같은 호스팅에 배포 시 VITE_FIREBASE_XXX 값을 환경변수로 설정해야 한다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 앱과 Firestore 인스턴스를 초기화한다.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// issues 컬렉션 참조를 미리 선언해 사용 편의성을 높인다.
const issuesCollection = collection(db, 'issues');
const metricsCollection = collection(db, 'metrics');

// 공개 조회 전용. Render 서버를 거치지 않고 Firestore에서 최신 이슈 목록을 가져온다.
export const getRecentIssues = async (maxCount = 50) => {
  // 날짜(date) 필드를 기준으로 최신 순 정렬한다. Firestore 필드가 문자열이므로 YYYY-MM-DD 포맷을 사용한다고 가정한다.
  const issuesQuery = query(issuesCollection, orderBy('date', 'desc'), limit(maxCount));
  const snapshot = await getDocs(issuesQuery);
  const items = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    // UI가 깨지지 않도록 필수 필드에 기본값을 채워준다.
    return {
      id: docSnap.id,
      easySummary: data.easySummary ?? '',
      title: data.title ?? '',
      date: data.date ?? '',
      category: data.category ?? '',
      summaryCard: data.summaryCard ?? '',
      background: data.background ?? '',
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      progressiveView: data.progressiveView ?? null,
      conservativeView: data.conservativeView ?? null,
      impactToLife: data.impactToLife ?? null,
      sources: Array.isArray(data.sources) ? data.sources : [],
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  });
  return items;
};

// 상세 페이지 /admin/edit 등에서 단일 문서를 조회할 때 사용한다.
export const getIssueById = async (issueId) => {
  const issueRef = doc(issuesCollection, issueId);
  const snapshot = await getDoc(issueRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  return {
    id: issueId,
    easySummary: data.easySummary ?? '',
    title: data.title ?? '',
    date: data.date ?? '',
    category: data.category ?? '',
    summaryCard: data.summaryCard ?? '',
    background: data.background ?? '',
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    progressiveView: data.progressiveView ?? null,
    conservativeView: data.conservativeView ?? null,
    impactToLife: data.impactToLife ?? null,
    sources: Array.isArray(data.sources) ? data.sources : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

// AdminNewPage에서 Firestore에 직접 새 문서를 생성한다. Render 서버를 거치지 않는다.
export const createIssue = async (issueDraft) => {
  const docRef = await addDoc(issuesCollection, {
    ...issueDraft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // TODO(프로덕션): 인증 없이 누구나 쓰기 허용하면 안 된다.
  return docRef.id;
};

// AdminEditPage에서 수정 저장 버튼이 호출한다. updatedAt을 갱신한다.
export const updateIssue = async (issueId, issueDraft) => {
  const issueRef = doc(issuesCollection, issueId);
  await updateDoc(issueRef, {
    ...issueDraft,
    updatedAt: serverTimestamp(),
  });
};

// AdminListPage/AdminEditPage에서 삭제를 수행한다.
export const deleteIssue = async (issueId) => {
  const issueRef = doc(issuesCollection, issueId);
  await deleteDoc(issueRef);
  // metrics 컬렉션이 존재한다면 동일한 문서를 함께 제거한다.
  const metricsRef = doc(metricsCollection, issueId);
  await deleteDoc(metricsRef);
};

// 간단한 검색/필터 기능이 필요할 때 사용할 헬퍼다.
// Firestore 쿼리로 복잡한 검색을 하지 않고 최근 문서를 가져온 뒤 프론트에서 substring 필터를 수행한다.
export const searchIssuesClient = async ({ queryText = '', category = '전체', maxCount = 50 } = {}) => {
  const normalizedQuery = queryText.trim().toLowerCase();
  const issues = await getRecentIssues(maxCount);
  return issues.filter((item) => {
    const matchCategory = category === '전체' || item.category === category;
    if (!normalizedQuery) {
      return matchCategory;
    }
    const haystack = [item.title, item.summaryCard, item.easySummary, item.background]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchCategory && haystack.includes(normalizedQuery);
  });
};

// TODO: 조회수(metrics) 추적을 원한다면 아래 주석처럼 Cloud Functions 또는 setDoc을 활용해 구현할 수 있다.
// import { setDoc, increment } from 'firebase/firestore';
// export const incrementView = async (issueId) => {
//   await setDoc(doc(metricsCollection, issueId), {
//     views: increment(1),
//     lastViewedAt: serverTimestamp(),
//   }, { merge: true });
// };

