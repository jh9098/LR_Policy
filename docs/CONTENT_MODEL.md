# 콘텐츠 데이터 모델 (issues 컬렉션)

이 문서는 Firestore `issues` 컬렉션의 최종 스키마와 활용 방법을 설명한다. 현재 운영 흐름은 **React 프런트엔드 → Firestore Web SDK** 직행 구조이며, Render/Express 백엔드는 레거시로만 남아 있다.

## 1. 기본 스키마

| 필드 | 타입 | 설명 | 화면 사용 위치 |
| --- | --- | --- | --- |
| `easySummary` | string | 일반 사용자가 바로 이해할 수 있는 1~2문장 요약 | 홈 카드(우선), 상세 "쉬운 요약" 카드 |
| `title` | string | 사건/정책 제목 | 홈 카드, 상세 페이지 헤더 |
| `date` | string (`YYYY-MM-DD` 또는 `정보 부족`) | 사건 혹은 발표일 | 홈 카드, 상세 헤더 |
| `category` | enum (`부동산`, `노동/노조`, `사법/검찰`, `외교/안보`, `기타`) | 분류용 카테고리 | 홈 카드, 필터 |
| `subcategory` | string | 상위 카테고리에 따라 선택 가능한 하위 분류. 값이 없으면 미분류로 처리 | 홈 카드, 상세 배지, 필터 |
| `summaryCard` | string | 메인 카드용 사실 위주 1~2문장 | 홈 카드, 상세 헤더 보조 문장 |
| `background` | string (멀티라인) | 사건의 전개·팩트 위주 설명 | 상세 "무슨 일이 있었나요?" 섹션 |
| `keyPoints` | array(string) | 핵심 bullet 문장 목록 | 상세 "핵심 쟁점" 섹션 |
| `progressiveView` | object 또는 `null` | 일부 진보 성향 주장 요약 | 상세 "진보 시각" 카드 |
| `conservativeView` | object 또는 `null` | 일부 보수 성향 주장 요약 | 상세 "보수 시각" 카드 |
| `impactToLife` | object 또는 `null` | 생활 체감 영향 요약 | 상세 "생활 영향" 카드 |
| `sources` | array(object) | 출처 목록 | 상세 "근거 자료" 섹션 |
| `createdAt` | Firestore Timestamp | 문서 생성 시각 | 관리/감사 용도 |
| `updatedAt` | Firestore Timestamp | 마지막 수정 시각 | 관리/감사 용도 |
| `views` | number (optional) | 조회수 | 향후 metrics 연동 시 활용 |

### 1.1 progressiveView / conservativeView 구조

```json
{
  "headline": "정부 개입은 서민 보호에 필수",
  "bullets": ["주요 주장 bullet", "예: 시장 규제 필요"],
  "intensity": 70, // 0~100, 비워두면 -1
  "note": "아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다."
}
```

- 두 필드는 선택(optional) 값이다. 하나만 존재해도 된다.
- `intensity`가 -1이면 UI에서 "자료 없음" 상태로 표시한다.
- `note`는 Admin 페이지에서 기본 문구가 자동 채워진다.

### 1.2 impactToLife 구조

```json
{
  "text": "중립적 해석과 체감 영향을 요약",
  "note": "이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)"
}
```

- 선택 항목이다. `text`가 비어 있으면 전체 필드를 `null`로 저장한다.

### 1.3 sources 구조

```json
{
  "type": "official" | "youtube" | "media" | "etc",
  "channelName": "국토교통부",
  "sourceDate": "2025-10-29" | "정보 부족",
  "timestamp": "12:30" | "",
  "note": "발표 핵심 메시지 요약"
}
```

- `channelName`이 비어 있으면 사용자가 식별하기 어려우므로 입력을 권장한다.
- timestamp는 선택 값이며 비워 두면 빈 문자열로 저장한다.

### 1.4 카테고리·하위 카테고리 목록

| 상위 카테고리 | 하위 카테고리 |
| --- | --- |
| 부동산 | 주거·주택공급 정책 · 전월세·임대차 제도 · 재건축·재개발·도시정비 · 부동산 세제·규제 |
| 노동/노조 | 임금·근로조건 정책 · 노사협상·파업 이슈 · 고용·산재·안전 규제 · 산업별 노동 현안 |
| 사법/검찰 | 수사·기소·사건 처리 · 법원 판결·양형 논쟁 · 사법개혁·제도개편 · 감찰·징계·인사 |
| 외교/안보 | 정상외교·국제협력 · 군사·방위 정책 · 동맹 현안 · 대북·통일 정책 |
| 기타 | 국회·정당·정치개혁 · 복지·보건·교육 정책 · 과학·디지털·규제 혁신 · 환경·에너지 전환 |

## 2. CRUD 흐름

1. `/admin/new`에서 issueDraft를 작성하면 `firebaseClient.createIssue()`가 Firestore에 바로 `addDoc()` 한다.
2. `/admin/edit/:id`에서는 `getIssueById()`로 문서를 읽고, 수정 후 `updateIssue()`를 호출한다.
3. `/admin/list`에서 목록을 불러오고 `deleteIssue()`로 즉시 삭제한다.
4. `/`와 `/issue/:id` 페이지도 모두 Firestore Web SDK로 직접 읽기(read)만 수행한다.

> ⚠️ DEV 단계에서는 Firestore Security Rules를 완전히 열어두었다. 누구나 /admin 페이지에 접근하면 모든 데이터를 바꿀 수 있다. **TODO:** 프로덕션에서는 인증을 붙이고 Rules를 잠가야 한다.

## 3. 화면 렌더링 규칙

1. `easySummary`가 비어 있으면 상세 "쉬운 요약" 카드가 숨겨진다. 홈 카드에서는 `easySummary` 우선, 없으면 `summaryCard`를 사용한다.
2. `background`와 `keyPoints`는 기본 정보이므로 가능하면 비워두지 않는다. 비어 있어도 컴포넌트는 안전하게 fallback 문구를 표시한다.
3. 진보/보수 섹션은 존재하는 쪽만 렌더링한다. intensity가 -1이면 게이지 대신 안내 문구를 표시한다.
4. 생활 영향과 출처도 선택 항목이지만, 운영자는 최소 한 개 이상의 출처를 작성해야 한다.

## 4. 부가 메트릭스 (metrics 컬렉션)

- `metrics/{issueId}` 문서는 `views`, `lastViewedAt` 등을 저장하는 용도로 예약되어 있다.
- 현재 프런트에서는 조회수를 증가시키지 않는다. TODO: Cloud Functions 또는 보안이 강화된 서버 측 로직을 도입해 안전하게 처리해야 한다.

## 5. 검증 체크리스트

- `title`, `summaryCard`, `background`는 반드시 입력한다.
- `date`는 `YYYY-MM-DD` 또는 `정보 부족`으로 통일한다.
- `keyPoints`는 배열로 저장하며 공백 bullet은 제거한다.
- 선택 섹션(progressive/conservative/impact)은 핵심 데이터가 없을 때 `null` 처리한다.
- `easySummary`는 비워둘 수 있지만, 운영 시에는 항상 독자 친화 문구를 채워 넣는 것을 권장한다.

## 6. TODO (보안)

- Firestore Rules에서 `allow write: if true`는 DEV 전용이다. 프로덕션에서는 인증된 관리자만 쓰기 가능하도록 규칙을 잠가야 한다.
- /admin 라우트 접근 자체도 인증/비밀번호 등으로 보호해야 하며, Render/Express 백엔드는 그때 다시 활성화한다.
