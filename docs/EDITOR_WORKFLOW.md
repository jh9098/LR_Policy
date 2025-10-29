# 에디터 작업 흐름 (현재 Firestore 직행 구조)

> ⚠️ 지금은 누구나 `/admin`에 접근하면 Firestore에서 직접 문서를 생성·수정·삭제할 수 있다.
> TODO: 프로덕션 단계에서는 Firestore Security Rules를 잠그고 `/admin` 자체를 인증으로 보호해야 한다.

## 1. 주요 화면

1. `/admin/new` – 신규 이슈 등록 폼. AI JSON 붙여넣기, 로컬 자동 저장, 실시간 미리보기 포함.
2. `/admin/list` – Firestore에서 불러온 최근 문서 목록. 보기/수정, 삭제 버튼 제공.
3. `/admin/edit/:id` – 특정 문서를 직접 수정/삭제하는 폼. Firestore에서 데이터를 읽어와 편집.

## 2. 신규 등록 절차 (`/admin/new`)

1. **AI에게 issueDraft JSON(v4)을 요청**
   - easySummary를 포함한 스키마로 응답을 받는다.
   - JSON 전체를 복사해 페이지 상단 “AI JSON 결과 붙여넣기” 텍스트 영역에 붙여넣는다.
2. **불러오기 버튼으로 파싱**
   - `JSON.parse`에 실패하면 빨간 오류 메시지가 표시된다.
   - 성공 시 `emptyDraft`와 병합되어 누락 필드가 자동 채워진다.
3. **폼에서 세부 조정**
   - 쉬운 요약, 제목, 날짜, 카테고리, summaryCard, background, keyPoints 등을 수정한다.
   - 진보/보수 시각, “이게 내 삶에 뭐가 변함?”은 필요 시 “섹션 추가” 버튼으로 생성한다.
   - bullet과 출처는 추가/삭제 버튼으로 배열 형태를 편집한다.
4. **자동 저장**
   - 모든 입력은 `localStorage('adminDraftV4')`에 즉시 저장된다.
   - 새로고침해도 마지막 상태가 복구된다. 제출이 완료되면 localStorage가 초기화된다.
5. **미리보기 확인**
   - 우측 패널이 상세 페이지와 동일한 구성으로 미리보기를 제공한다.
   - 값이 비어 있는 섹션은 자동으로 숨겨진다.
6. **등록하기 버튼**
   - `firebaseClient.createIssue(issueDraft)`가 호출되어 Firestore에 `addDoc()`을 실행한다.
   - 성공 시 alert로 문서 ID를 보여주고, 폼과 localStorage가 초기화된다.
   - 실패 시 상단에 빨간 오류 메시지를 표시한다.

## 3. 목록/삭제 (`/admin/list`)

- 페이지 로드시 `firebaseClient.getRecentIssues()`를 호출해 Firestore에서 최대 100건을 읽어온다.
- 테이블에는 날짜, 카테고리, 제목, 쉬운 요약/summary가 표시된다.
- “보기 / 수정” 버튼을 누르면 `/admin/edit/:id`로 이동한다.
- “삭제” 버튼은 `firebaseClient.deleteIssue(id)`를 호출해 Firestore `issues`와 `metrics` 문서를 삭제한다.
  - confirm 창으로 한 번 더 확인하며, 성공 시 목록에서 바로 제거된다.

## 4. 수정/삭제 (`/admin/edit/:id`)

1. 페이지 진입 시 `firebaseClient.getIssueById(issueId)`로 기존 문서를 불러온다.
2. 폼 구조는 `/admin/new`와 동일하며, 수정 후 “수정 저장”을 누르면 `firebaseClient.updateIssue(issueId, issueDraft)`가 실행된다.
3. “이 글 삭제” 버튼은 `firebaseClient.deleteIssue(issueId)`를 호출하고 `/admin/list`로 이동한다.
4. 우측 미리보기는 현재 입력 상태를 실시간으로 보여준다.

## 5. 주의 사항 및 TODO

- Firestore Security Rules는 현재 `allow read, write: if true;`라고 가정한다. 외부에 URL을 공유하지 말 것.
- 추후에는 인증이 된 운영자만 쓰기를 허용하도록 규칙과 인증 절차를 반드시 도입해야 한다.
- metrics(조회수) 추적은 현재 비활성 상태다. 필요 시 Cloud Functions 또는 서버 측 로직으로 보완한다.
