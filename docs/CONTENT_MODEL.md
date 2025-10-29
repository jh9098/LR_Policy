# 콘텐츠 데이터 모델 (issues 컬렉션)

## 개요

- 현재 모든 CRUD는 프론트엔드(React)에서 Firestore Web SDK를 통해 직접 수행한다.
- Render/Express 백엔드는 비활성 상태이며 레거시 참조용으로만 남아 있다.
- 이 문서는 `issues` 컬렉션과 보조 `metrics` 컬렉션의 구조를 최신 스키마에 맞춰 설명한다.
- TODO: 프로덕션 배포 전에는 Firestore Security Rules를 잠그고, 익명 쓰기를 차단해야 한다.

## 1. issueDraft 스키마

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `easySummary` | string | 일반 방문자를 위한 쉬운 한 줄 요약. 비어 있으면 카드가 숨겨짐. |
| `title` | string | 사건/정책 제목. |
| `date` | string | `YYYY-MM-DD` 또는 `정보 부족`. |
| `category` | enum (`부동산`, `노동/노조`, `사법/검찰`, `외교/안보`, `기타`) | 홈/필터/상세에서 사용. |
| `summaryCard` | string | 홈 카드 및 상세 헤더 보조 설명. |
| `background` | string | 사건/정책 배경 설명(멀티라인). |
| `keyPoints` | string[] | 핵심 bullet 목록. |
| `progressiveView` | null 또는 object | 진보 시각(선택). |
| `conservativeView` | null 또는 object | 보수 시각(선택). |
| `impactToLife` | null 또는 object | 생활 영향 요약(선택). |
| `sources` | object[] | 출처 목록. |
| `createdAt` | Firestore Timestamp | 자동 생성 필드. |
| `updatedAt` | Firestore Timestamp | 자동 갱신 필드. |

### 1.1 쉬운 요약 (`easySummary`)
- 한 줄 1~2문장으로 사건을 설명한다.
- 홈 카드에서는 `easySummary`가 있으면 우선 사용하고, 없으면 `summaryCard`를 사용한다.
- 상세 페이지에서는 “한 줄로 말하면?” 카드로 노출된다.

### 1.2 배경 및 핵심 쟁점
- `background`는 여러 문단을 줄바꿈 2회로 구분해 저장한다.
- `keyPoints`는 Admin 페이지에서 배열로 관리하며, 상세 페이지와 미리보기 모두 bullet 목록으로 노출된다.

### 1.3 진보/보수 시각 (`progressiveView`, `conservativeView`)
```json
{
  "headline": "정부 개입이 필요하다",
  "bullets": ["주장 bullet 1", "주장 bullet 2"],
  "intensity": 70, // 선택. -1 또는 빈 값이면 UI에서 게이지 숨김
  "note": "아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다."
}
```
- 두 시각 모두 선택(optional)이다.
- `bullets`가 비어 있고 `headline`도 없으면 섹션 자체를 null로 저장한다.
- intensity 값은 0~100 정수, 미입력 시 `-1`로 저장한다.

### 1.4 생활 영향 (`impactToLife`)
```json
{
  "text": "체감 변화 요약",
  "note": "이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)"
}
```
- 선택 필드이며 `text`가 비어 있으면 전체를 null로 둔다.

### 1.5 출처 (`sources`)
```json
{
  "type": "official",
  "channelName": "국토교통부",
  "sourceDate": "2025-10-29",
  "timestamp": "12:30",
  "note": "자료 요약"
}
```
- `channelName`이 비어 있으면 저장하지 않는다.
- `type`은 `official`, `youtube`, `media`, `etc` 중 하나를 권장한다.

## 2. metrics 컬렉션 (선택)
- 문서 ID는 `issues` 컬렉션의 ID와 동일하다.
- 필드 예시: `{ views: number, lastViewedAt: Timestamp }`
- 현재 SPA에서는 조회수를 자동 증가시키지 않는다. TODO로 남겨둔다.

## 3. CRUD 흐름
- `getRecentIssues`, `getIssueById`, `createIssue`, `updateIssue`, `deleteIssue` 모두 `src/firebaseClient.js`에서 정의되어 있으며, 브라우저에서 직접 Firestore를 호출한다.
- Render/Express 서버는 비활성 상태다.

## 4. 보안 TODO
- 프로덕션 환경에서는 Firestore Security Rules에서 `allow write: if request.auth != null` 등 최소 권한 정책으로 전환해야 한다.
- `/admin` 라우트는 인증/인가로 보호해야 하며, 익명 사용자가 Firestore를 수정하지 못하도록 막아야 한다.
