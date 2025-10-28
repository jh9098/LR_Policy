# 콘텐츠 데이터 모델 (issues 컬렉션)

이 문서는 Firestore `issues` 컬렉션에 저장되는 정책/사건 문서 구조를 설명합니다. 모든 화면(UI)은 이 스키마를 기준으로 동작합니다.

## 1. 필드 개요

| 필드 | 타입 | 설명 | 화면 사용 위치 |
| --- | --- | --- | --- |
| `title` | string | 정책/사건 제목 | 상세 페이지 헤더, 홈 카드 |
| `date` | string (YYYY-MM-DD) | 사건 혹은 발표일 | 홈 카드, 상세 헤더 |
| `category` | enum (`부동산`, `노동/노조`, `사법/검찰`, `외교/안보`, `기타`) | 분류용 카테고리 | 홈 카드, 필터, 상세 헤더 |
| `summaryCard` | string | 홈 카드에 노출되는 짧은 요약 (1~2문장) | 홈 카드, 상세 헤더 보조 문장 |
| `background` | string (멀티라인) | 사건/정책을 설명하는 정보성 본문. 사실과 맥락 중심 서술 | 상세 페이지 “이 사건/정책은 무엇인가?” 섹션 |
| `keyPoints` | array(string) | 독자가 알아야 할 핵심 bullet 요약 | 상세 페이지 “핵심 쟁점 요약” 목록 |
| `progressiveView?` | object | 선택: 일부 진보적 시각 정리 | 상세 페이지 “주요 시각들 - 진보” 카드 (없으면 미표시) |
| `progressiveIntensity?` | number (0~100) | 선택: 진보 시각의 주장 강도 | 진보 카드 내부 게이지 (없으면 미표시) |
| `conservativeView?` | object | 선택: 일부 보수적 시각 정리 | 상세 페이지 “주요 시각들 - 보수” 카드 (없으면 미표시) |
| `conservativeIntensity?` | number (0~100) | 선택: 보수 시각 주장 강도 | 보수 카드 내부 게이지 (없으면 미표시) |
| `impactToLife?` | object | 선택: 생활 영향 요약 (ChatGPT 의견) | 상세 페이지 “이게 내 삶에 뭐가 변함?” 카드 (없으면 미표시) |
| `sources?` | array(object) | 선택: 출처 리스트 | 상세 페이지 “출처” 테이블 (없으면 “등록된 출처 없음”) |
| `createdAt` | Firestore Timestamp | 문서 생성 시각 | UI 직접 표시는 없지만 정렬에 사용 |
| `updatedAt` | Firestore Timestamp | 마지막 수정 시각 | UI 직접 표시는 없지만 감사/관리 용도 |

### 1.1 `progressiveView` / `conservativeView` 구조

```json
{
  "headline": "정부 개입은 서민 보호에 필수",
  "bullets": ["주요 주장 bullet", "예: 시장 규제 필요"],
  "note": "아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다."
}
```

- `headline`과 `bullets`가 모두 비어 있으면 UI에서 자동으로 숨겨집니다.
- `note`는 고정 문구를 사용하며, 관리자 입력 화면에서 자동으로 채워집니다.
- `progressiveIntensity`, `conservativeIntensity` 필드는 카드 내부 게이지에만 사용되며, 값이 없으면 게이지 자체가 렌더링되지 않습니다.

### 1.2 `impactToLife`

```json
{
  "text": "중립적 해석과 체감 영향 요약",
  "note": "이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)"
}
```

- 텍스트가 비어 있으면 필드 자체를 저장하지 않습니다.
- note 문구는 고정이며, 상세 페이지에서 반드시 “(ChatGPT의 의견)”이 포함된 설명으로 렌더링됩니다.

### 1.3 `sources`

각 요소는 아래 구조를 사용합니다.

```json
{
  "type": "official" | "youtube" | "media" | "etc",
  "channelName": "국토교통부",
  "sourceDate": "2025-10-29",
  "timestamp": "12:30",
  "note": "발표 핵심 메시지 요약"
}
```

- `timestamp`는 선택 값이며 없으면 `null` 또는 빈 문자열로 저장됩니다.
- 상세 페이지에서는 배지와 함께 테이블 형태로 노출됩니다.

## 2. 화면 렌더링 규칙

1. **기본 정보(배경/핵심 쟁점)**는 항상 출력됩니다. 이 영역이 독자가 사건을 이해하는 기반입니다.
2. **주요 시각들(진보/보수)**은 각각 독립적으로 선택 사항입니다. 하나만 존재해도 해당 카드만 렌더링하고, 둘 다 없으면 전체 “주요 시각들” 섹션을 숨깁니다.
3. **생활 영향(impactToLife)**와 **출처(sources)** 역시 선택 사항입니다. 데이터가 없으면 섹션 자체가 숨겨지거나 “등록된 출처 없음” 안내가 표시됩니다.
4. 진보/보수 구분은 “사람/채널을 정치적으로 분류”하려는 목적이 아니라, **이번 사안을 해석하는 대표 주장들**을 정리하는 보조 정보입니다. 따라서 headline과 bullet 작성 시 명확한 출처나 주장 맥락을 기재해야 합니다.

## 3. 정렬 및 검색

- 홈 화면 카드 리스트는 `createdAt` 내림차순으로 최근 20건을 가져옵니다.
- 검색 API는 최근 50건을 조회한 뒤 `category`와 `title/summaryCard` 부분 일치로 필터링합니다.

## 4. 필수 값 검증 체크리스트

- `title`, `date`, `summaryCard`, `background`는 비워 두면 안 됩니다.
- `keyPoints`는 줄바꿈으로 구분된 bullet이며 최소 1개 이상 필요합니다.
- `sources`는 적어도 하나 이상의 출처를 포함해야 하며, 각 출처의 `channelName`은 필수입니다.
- 선택 섹션은 headline과 bullet이 모두 비어 있으면 저장하지 않습니다.

