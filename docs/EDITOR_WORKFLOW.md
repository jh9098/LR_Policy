# 에디터 작업 흐름 (운영 대시보드 기준)

운영자는 `/admin` 영역을 통해 이슈를 작성·관리합니다. 지금은 개발 단계라 인증이 비활성화되어 있으니, URL은 내부 인원만 사용해 주세요.

## 1. 핵심 화면

1. `/admin/new` – 새 이슈 작성, AI JSON 붙여넣기, 실시간 미리보기
2. `/admin/list` – 최근 20개의 등록 문서 확인 및 삭제
3. `/admin/edit/:id` – 저장된 문서를 확인하고 추후 수정 기능을 위한 초안 화면

> ⚠️ 현재는 인증이 꺼져 있습니다. 외부 공유를 피하고, 운영 전까지 관리자 인증을 반드시 붙여야 합니다.

## 2. 작성 절차 (`/admin/new`)

1. **AI에게 issueDraft JSON을 받아오기**
   - 프롬프트 예시: “다음 사건을 issueDraft JSON 스키마에 맞춰 작성해 줘.”
   - JSON 구조는 다음과 같습니다.
     ```json
     {
       "title": "...",
       "date": "YYYY-MM-DD 또는 정보 부족",
       "category": "부동산 | 노동/노조 | 사법/검찰 | 외교/안보 | 기타",
       "summaryCard": "홈 화면 요약",
       "background": "여러 단락으로 작성",
       "keyPoints": ["bullet1", "bullet2"],
       "progressiveView": {
         "headline": "",
         "bullets": [""],
         "intensity": 0,
         "note": "고정 문구"
       },
       "conservativeView": { ... },
       "impactToLife": { ... },
       "sources": [
         {
           "type": "official | youtube | media | etc",
           "channelName": "",
           "sourceDate": "YYYY-MM-DD 또는 정보 부족",
           "timestamp": "",
           "note": ""
         }
       ]
     }
     ```
   - AI가 줄바꿈이나 주석을 잘못 넣으면 JSON이 깨질 수 있으니, 유효한 JSON만 붙여넣어 주세요.

2. **JSON 붙여넣기 & 검증**
   - `/admin/new` 상단의 “AI JSON 불러오기” 영역에 결과를 통으로 붙여넣고 “불러오기” 버튼을 누릅니다.
   - 브라우저가 `JSON.parse`를 그대로 실행하므로, 형식이 틀리면 빨간 경고 문구로 오류 메시지가 노출됩니다.
   - JSON을 자동으로 고쳐주지 않으니, 오류가 나면 프롬프트를 다듬어 다시 받아야 합니다.

3. **폼 수정 및 보완**
   - JSON이 정상적으로 파싱되면 모든 필드가 한 번에 채워집니다.
   - 필요에 따라 좌측 폼에서 제목, 배경, bullet 등을 수정합니다.
   - 진보/보수 시각, “이게 내 삶에 뭐가 변함?” 섹션은 기본값이 `null`이므로, “섹션 추가” 버튼을 눌러 활성화합니다.
   - bullet 계열은 textarea에 줄바꿈으로 입력하면 배열로 저장됩니다.
   - 출처는 카드 형태로 여러 개 추가할 수 있으며, 최소 1개 이상 입력해야 합니다.

4. **자동 저장과 초기화**
   - 작성 중인 내용은 `localStorage('adminDraftV3')`에 자동 저장됩니다.
   - 새로고침 후에도 작성중이던 draft가 복구되며, “초기화” 버튼을 누르면 빈 초안으로 되돌고 로컬 저장본도 비워집니다.

5. **등록 버튼**
   - “등록하기” 버튼을 누르면 `POST ${API_BASE_URL}/issues`로 issueDraft 객체 전체가 전송됩니다.
   - 지금은 인증 없이 Firestore에 바로 저장되며, 성공 시 `alert("등록 완료")`가 표시되고 폼과 localStorage가 초기화됩니다.
   - 실패 시 빨간 경고 문구가 표시됩니다.

## 3. 목록과 삭제 (`/admin/list`)

- 화면 진입 시 `GET /api/issues`로 최근 20건을 불러옵니다.
- “보기 / 수정”을 클릭하면 `/admin/edit/:id`로 이동합니다.
- “삭제”를 누르면 `DELETE /api/issues/:id`를 즉시 호출해 Firestore 및 `metrics` 문서를 함께 제거합니다. 되돌릴 수 없으니 주의하세요.

## 4. 수정 초안 (`/admin/edit/:id`)

- 저장된 데이터를 카드 형태로 확인할 수 있는 화면입니다.
- 아직 PUT API 연결은 되어 있지 않으며, 추후 업데이트 시 여기서 수정 후 저장할 계획입니다.
- 필요하면 이 화면에서도 삭제를 실행할 수 있습니다.

## 5. 추후 TODO

- `/admin` 전역에 관리자 인증/권한 체크 추가 (예: x-admin-secret, OAuth 등)
- `POST/PUT/DELETE` 요청 시 관리자 키 검증 및 감사 로그 수집
- 수정 폼 완성 및 `PUT /api/issues/:id` 연동

> TODO 목록은 코드에도 주석으로 남겨두었습니다. 실서비스 전에는 반드시 인증과 보안을 강화해야 합니다.
