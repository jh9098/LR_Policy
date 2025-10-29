# 콘텐츠 데이터 모델 (issues 컬렉션)

이 문서는 Firestore `issues` 컬렉션의 리뉴얼 구조를 정리합니다. 프론트엔드와 백엔드는 아래 스키마를 기준으로 데이터를 주고 받습니다.

## 1. 필드 개요

| 필드 | 타입 | 설명 | 화면 사용 위치 |
| --- | --- | --- | --- |
| `easySummary` | string | 일반인이 바로 이해하도록 풀어 쓴 1~2문장짜리 쉬운 요약 | 상세 페이지 상단 "한 줄로 말하면?" 카드, 에디터 미리보기 |
| `title` | string | 정책/사건 제목 | 상세 페이지 헤더, 홈 카드 |
| `date` | string (YYYY-MM-DD) | 사건 혹은 발표일 | 홈 카드, 상세 헤더 |
| `category` | enum (`부동산`, `노동/노조`, `사법/검찰`, `외교/안보`, `기타`) | 분류용 카테고리 | 홈 카드, 필터, 상세 헤더 |
| `summaryCard` | string | 홈 카드에 노출되는 짧은 요약 (1~2문장) | 홈 카드, 상세 헤더 보조 문장 |
| `background` | string (멀티라인) | 사건/정책 설명 본문. 공식 확인된 사실만 정리 | 상세 페이지 “이 사건/정책은 무엇인가?” |
| `keyPoints` | array(string) | 독자가 알아야 할 핵심 bullet 모음 | 상세 페이지 “핵심 쟁점 요약” 목록 |
| `progressiveView?` | object | 선택: 일부 진보 시각 요약 | 상세 “주요 시각들 - 진보” 카드 |
| `conservativeView?` | object | 선택: 일부 보수 시각 요약 | 상세 “주요 시각들 - 보수” 카드 |
| `impactToLife?` | object | 선택: 생활 영향 요약 (ChatGPT 의견) | 상세 “이게 내 삶에 뭐가 변함?” 카드 |
| `sources` | array(object) | 출처 리스트 | 상세 “출처” 영역 |
| `createdAt` | Firestore Timestamp | 문서 생성 시각 | 정렬 기준 |
| `updatedAt` | Firestore Timestamp | 마지막 수정 시각 | 관리/감사 용도 |

### 1.1 `easySummary`

- 누구나 이해할 수 있게 쉬운 말로 작성한 한 줄 요약입니다.
- AdminNewPage에서 반드시 입력하며, 빈 문자열이어도 필드 자체는 유지합니다.
- IssuePage 상단 “한 줄로 말하면?” 카드에 노출됩니다. 비어 있으면 카드가 렌더링되지 않습니다.

### 1.2 `progressiveView` / `conservativeView`

```json
{
  "headline": "정부 개입은 서민 보호에 필수",
  "bullets": ["주요 주장 bullet", "예: 시장 규제 필요"],
  "note": "아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.",
  "intensity": 70
}
```

- 두 뷰 모두 **선택(optional)** 입니다. `headline`과 `bullets`가 모두 비어 있으면 저장하지 않습니다.
- `intensity`도 선택 값으로 0~100 정수 범위입니다. 비워두면 `-1`로 저장하고, 화면에서는 게이지가 숨겨집니다.
- `note`는 고정 안내 문구이며, 관리 페이지에서 자동으로 채워집니다.

### 1.3 `impactToLife`

```json
{
  "text": "중립적 해석과 체감 영향을 요약",
  "note": "이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)"
}
```

- 전체가 선택 항목입니다. `text`가 비어 있으면 필드를 저장하지 않습니다.
- `note`는 고정 문구로 유지합니다.

### 1.4 `sources`

`AdminNewPage`에서 카드마다 type/channelName/sourceDate/timestamp/note를 입력하면 서버에서 아래 구조로 저장합니다.

```json
{
  "type": "official" | "youtube" | "media" | "etc",
  "channelName": "국토교통부",
  "sourceDate": "2025-10-29",
  "timestamp": "12:30" | "",
  "note": "발표 핵심 메시지 요약"
}
```

- `channelName`이 비어 있으면 해당 항목은 저장하지 않습니다.
- `timestamp`를 비워 두면 빈 문자열로 저장되며, 화면에서는 `-`로 표기합니다.

## 2. 화면 렌더링 규칙

1. **쉬운 요약**은 값이 존재할 때 상세 페이지 상단 카드로 표시됩니다.
2. **기본 정보(배경/핵심 쟁점)**는 항상 노출됩니다.
3. **주요 시각들(진보/보수)**은 각각 독립적으로 선택 항목입니다. 한쪽만 존재하면 그 카드만 렌더링하고, 둘 다 없으면 섹션 전체가 숨겨집니다.
4. **이게 내 삶에 뭐가 변함?**과 **출처** 역시 선택 항목이지만, `sources`는 최소 한 개 이상 입력을 권장합니다.
5. intensity 값이 없으면 게이지 컴포넌트가 숨겨져 빈 공간이 생기지 않습니다.
6. 진보/보수 시각은 주장 요약용 보조 정보입니다. 문장에 주장 주체나 근거를 명시해 오해가 없도록 작성합니다.

## 3. 정렬 및 검색

- 홈 화면 카드 목록은 `createdAt` 내림차순 기준으로 최근 20건을 보여줍니다.
- 검색 API는 최근 50건을 메모리로 가져온 뒤 `category`와 `title`/`summaryCard` 부분 일치로 필터링합니다. easySummary는 현재 검색에 사용하지 않습니다.

## 4. 메트릭스 컬렉션

- `metrics/{issueId}` 문서는 `views`(조회수)와 `lastViewedAt`(Firestore 서버 타임스탬프)을 저장합니다.
- 상세 페이지를 열 때마다 카운터를 증가시키며, 추후 인증/Rate Limit을 도입해 악의적 트래픽을 방지할 예정입니다.

## 5. 필수 값 검증 체크리스트

- `title`, `date`, `summaryCard`, `background`는 비워둘 수 없습니다.
- `keyPoints`는 줄바꿈 기반 bullet이며 최소 1개 이상 필수입니다.
- `sources`는 최소 한 개 이상의 출처가 필요하며, `channelName`이 반드시 채워져야 합니다.
- 선택 섹션(진보/보수/impact)은 핵심 데이터가 없으면 필드를 제외합니다.
- `easySummary`는 빈 문자열이 허용되지만, 운영자는 항상 독자 친화 문구를 채워 넣어야 합니다.
