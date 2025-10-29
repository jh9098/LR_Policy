# 배포 가이드 (Firestore 직행 버전)

## 1. 현재 구조
- **프론트엔드**: `frontend/` (Vite + React + Tailwind)
- **백엔드**: `backend/` (Express) → 현재 비활성. 레거시 참고용으로만 보관.
- **데이터베이스**: Firestore (`issues`, 선택적 `metrics`)
- 모든 CRUD 작업은 브라우저에서 Firestore Web SDK를 사용해 직접 수행한다.

## 2. Netlify 배포 (프론트)
1. Netlify에서 새 사이트를 생성하고 `frontend/`를 배포 대상으로 지정한다.
2. Build command: `npm run build`, Publish directory: `dist`
3. 환경 변수 설정 (필수)
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. `firebaseClient.js`는 위 환경 변수를 기반으로 Firebase 앱을 초기화한다.
5. Render 백엔드를 호출하지 않으므로 `VITE_API_BASE_URL`은 없어도 된다.
6. 배포 후 `/admin` URL을 공개적으로 공유하지 말 것 (현재는 누구나 Firestore를 수정 가능).

## 3. Render 백엔드 상태
- Express 서버는 더 이상 런타임에서 사용하지 않는다.
- 향후 인증/권한 제어를 도입할 때 레거시 코드를 참고하여 부활시킬 수 있다.
- 현재는 Render에 배포하지 않아도 된다.

## 4. Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /issues/{docId} {
      allow read: if true;
      allow write: if true; // DEV ONLY
    }
    match /metrics/{issueId} {
      allow read: if true;
      allow write: if true; // DEV ONLY
    }
  }
}
```
- 위 규칙은 개발 편의용이다.
- TODO: 프로덕션 단계에서는 인증된 운영자만 쓰기를 허용하도록 규칙을 잠궈야 한다.

## 5. 로컬 개발
```bash
# 프론트엔드
cd frontend
npm install
npm run dev
```
- `.env.local` 또는 shell 환경에 Firebase Web SDK용 Vite 변수들을 설정해야 한다.
- 필요하다면 `VITE_API_BASE_URL`을 남겨두어도 무방하지만 현재 사용되지 않는다.

## 6. 향후 TODO
- `/admin` 경로에 인증/인가 추가 (예: Firebase Auth, OAuth 등).
- Firestore Security Rules 최소 권한화.
- metrics(조회수) 집계는 Cloud Functions 등으로 이전하고, 클라이언트에서 직접 쓰지 않도록 설계 변경.
- SSR/프리렌더링 도입을 통해 MetaTags가 SNS 미리보기에서도 동작하도록 개선.
