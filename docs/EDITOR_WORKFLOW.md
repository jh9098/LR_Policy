# 에디터 워크플로우 (DEV 버전)

현재 모든 CRUD가 React 프런트엔드에서 Firestore Web SDK를 통해 직접 수행된다. Render/Express 백엔드는 비활성 상태로 남아 있으며, 보안을 강화할 때 다시 사용할 예정이다.

## 1. 새 글 등록 절차

1. **AI 프롬프트 실행** – 이슈 초안을 요청해 `issueDraft` JSON(v4 스키마, easySummary 포함)을 받는다. JSON은 한 줄 문자열이어야 한다.
2. **/admin/new 접속** – 상단 "AI JSON 결과 붙여넣기" textarea에 그대로 붙여넣고 `불러오기` 버튼을 클릭한다.
3. **필드 보정** – 폼에서 easySummary, keyPoints, 진보/보수 시각, 생활 영향, 출처 등을 필요한 만큼 수정한다. 미리보기 카드에서 바로 렌더링 결과를 확인할 수 있다.
4. **등록하기** – `등록하기` 버튼을 누르면 `firebaseClient.createIssue(issueDraft)`가 Firestore `issues` 컬렉션에 `addDoc()`을 실행한다. Render/Express 서버는 전혀 관여하지 않는다.
5. **확인** – `/admin/list`에 즉시 새 글이 나타난다. 필요하면 `/admin/edit/:id`에서 추가 수정하거나 삭제할 수 있다.

> ⚠️ DEV 단계에서는 Firestore Security Rules에서 `issues` 컬렉션에 대해 read/write 모두 허용하고 있다. 따라서 누구나 /admin 페이지에 접근하면 문서를 생성·수정·삭제할 수 있다. 프로덕션 전환 시 인증/권한 체계를 반드시 도입해야 한다.

## 2. 기존 글 수정 / 삭제

- `/admin/list`는 `firebaseClient.getRecentIssues()`로 최대 50개 문서를 불러와 보여준다.
- 각 행의 "보기 / 수정" 버튼을 누르면 `/admin/edit/:id`로 이동한다. 이 페이지는 `getIssueById()`로 데이터를 불러오고, 저장 시 `updateIssue()`를 호출한다.
- "이 글 삭제" 버튼을 누르면 `deleteIssue(issueId)`가 Firestore에서 문서를 즉시 제거하며, 필요 시 metrics 컬렉션의 동일 ID 문서도 삭제된다.

## 3. /admin 페이지 주의사항

- 현재는 **인증/비밀번호가 없다.** URL을 아는 사람이라면 누구든지 CRUD 작업이 가능하다.
- TODO: 프로덕션에서는 Firebase Authentication 혹은 자체 인증을 붙이고, Firestore Rules에서 `allow write: if request.auth != null` 등으로 잠궈야 한다.
- Render/Express 백엔드는 `backend/` 디렉토리에 레거시 초안으로 남겨두었으며, 추후 보안 강화를 위해 재활용할 수 있다.

## 4. 오류 대응

- Firestore 환경변수(VITE_FIREBASE_*)가 설정되지 않았거나 Rules가 잠겨 있으면 CRUD 작업이 실패한다.
- `/admin/new` JSON 파싱 오류는 상단 경고로 표시되며, 줄바꿈 제거·형식 확인 후 다시 시도하면 된다.
- 네트워크 오류 발생 시 브라우저 콘솔을 열어 firebaseClient.js 함수의 에러 메시지를 확인한다.

## 5. TODO (보안 및 자동화)

- 인증이 붙은 후에는 Firestore Rules를 tightening 하고, /admin 접근 로그를 남길 계획이다.
- 조회수(metrics) 누적은 현재 프런트에서 수행하지 않는다. Cloud Functions 등 백엔드 경로에서 안전하게 처리하도록 남겨둔 TODO다.
