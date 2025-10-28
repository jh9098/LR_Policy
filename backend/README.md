# LR Policy 백엔드 서버 & Firestore 가이드

이 문서는 Node.js + Express 기반의 LR Policy 백엔드 서버와 Firestore `issues` 컬렉션을 설정하고 운영하기 위한 전체 가이드를 제공합니다. 비전공자도 차근차근 따라 할 수 있도록 단계별로 설명합니다.

## 1. 폴더 구조

```
/backend
  ├── package.json
  ├── server.js
  ├── firebaseAdmin.js
  ├── routes/
  │   └── issues.js
  ├── .env.example
  └── README.md (현재 문서)
```

## 2. 사전 준비물

1. **Node.js 18 LTS 이상** 설치 (https://nodejs.org). Render 환경도 Node 18을 기본 제공하므로 동일 버전을 권장합니다.
2. **Firebase 프로젝트** 및 **서비스 계정 키** (JSON) 생성. 키 파일 내용 전체를 Render 환경 변수에 그대로 붙여 넣을 예정입니다.
3. **Firestore Database** 사용 설정 및 `issues` 컬렉션 권한 확인.

## 3. 환경 변수 설정 방법

`.env.example` 파일을 참고해 `.env` 파일을 생성하거나 Render 환경 변수에 그대로 입력합니다.

| 변수명 | 설명 | 예시 |
| --- | --- | --- |
| `PORT` | 서버가 청취할 포트 번호. Render에서는 자동 할당되므로 `PORT` 변수를 사용하면 됩니다. | `5000` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 서비스 계정 JSON 전체 문자열을 한 줄로 입력합니다. 큰따옴표(`"`)와 줄바꿈(`\n`)을 그대로 포함해야 합니다. | `{ "type": "service_account", ... }` |

> **TIP**: 로컬 개발 시 `.env` 파일에 `FIREBASE_SERVICE_ACCOUNT`를 붙여 넣으면 개인정보가 담기므로 `.gitignore`에 `.env`를 추가해 커밋하지 않도록 주의합니다.

## 4. 로컬 개발 절차

1. `cd backend`
2. 의존성 설치: `npm install`
3. `.env` 파일 생성 후 환경 변수 입력 (`.env.example` 참고)
4. 개발 서버 실행: `npm run dev`
   - `nodemon`이 파일 변화를 감지해 자동으로 재시작합니다.
5. 브라우저에서 `http://localhost:5000/api/issues` 엔드포인트가 JSON을 반환하는지 확인합니다.

## 5. Render 배포 가이드

1. GitHub 저장소를 Render에 연결합니다.
2. **New Web Service**를 생성하고, 빌드 커맨드를 `npm install`, 시작 커맨드를 `npm start`로 설정합니다.
3. **Environment**를 `Node`로 선택합니다.
4. **Environment Variables** 섹션에 아래 값을 추가합니다.
   - `PORT` : `10000`과 같이 Render에서 원하는 포트 번호 (Render가 내부적으로 설정해 줍니다).
   - `FIREBASE_SERVICE_ACCOUNT` : 서비스 계정 JSON 전체 문자열을 그대로 붙여 넣습니다.
5. 배포가 완료되면 Render가 제공하는 URL을 확인합니다. 예: `https://lr-policy-backend.onrender.com`
6. Health check를 위해 루트 엔드포인트(`/`)가 JSON 메시지를 응답하도록 구현되어 있습니다.

## 6. Netlify 프론트엔드 연동

- Netlify에 배포된 프론트엔드는 `fetch('https://render-app-url/api/issues')` 형태로 이 백엔드 API를 호출합니다.
- CORS가 기본적으로 허용되므로 추가 설정 없이도 Netlify 도메인에서 접근 가능합니다.
- 프론트엔드 배포 시 Render 백엔드 URL을 환경 변수 또는 설정 파일로 관리하세요.

## 7. API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/issues` | `issues` 컬렉션에서 `createdAt` 기준 최신 20개 문서를 가져와 목록(요약 정보만) 반환 |
| `GET` | `/api/issues/:id` | 지정한 ID의 전체 이슈 문서를 반환 |
| `POST` | `/api/issues` | 요청 본문의 이슈 데이터를 Firestore에 저장. `createdAt`/`updatedAt`은 서버에서 자동 추가 *(TODO: 인증 필요)* |

### 7.1 응답 예시

```json
// GET /api/issues
[
  {
    "id": "2025-10-28-housing-policy",
    "title": "부동산 정책 발표 논란",
    "date": "2025-10-28",
    "summary": "정부의 신규 주택 관련 정책 발표 이후 진보/보수 프레임 충돌"
  }
]
```

```json
// GET /api/issues/2025-10-28-housing-policy
{
  "id": "2025-10-28-housing-policy",
  "title": "부동산 정책 발표 논란",
  "date": "2025-10-28",
  "summary": "정부의 신규 주택 관련 정책 발표 이후 진보/보수 프레임 충돌",
  "summaryFacts": [
    "확실한 사실: 2025-10-28 국토부가 신규 정책을 발표했다."
  ],
  "progressiveFrame": {
    "headline": "서민 주거 안정에 꼭 필요했다는 주장",
    "points": [
      "확실하지 않은 사실: 정부가 시장 왜곡을 바로잡을 것이라는 기대"
    ],
    "note": "위 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음"
  },
  "conservativeFrame": {
    "headline": "총선용 퍼주기식 정책이라는 주장",
    "points": [
      "확실하지 않은 사실: 세금으로 시장을 인위적으로 띄운다는 지적"
    ],
    "note": "위 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음"
  },
  "impactToLife": {
    "text": "ChatGPT의 의견: 무주택 30대는 단기적으로 매수 압박을 받을 수 있다."
  },
  "sources": [
    {
      "type": "youtube",
      "channelName": "○○TV",
      "videoDate": "2025-10-28",
      "timestamp": "12:30~13:10",
      "note": "정책은 결국 서민 지원이라고 주장"
    }
  ],
  "createdAt": {
    "_seconds": 1698457800,
    "_nanoseconds": 0
  },
  "updatedAt": {
    "_seconds": 1698457800,
    "_nanoseconds": 0
  }
}
```

## 8. Firestore `issues` 컬렉션 스키마 상세

이 섹션은 기존 정의서를 유지하면서 백엔드와 데이터 입력 담당자가 동일한 기준을 공유하도록 정리했습니다.

### 8.1 컬렉션 개요

- **컬렉션명**: `issues`
- **용도**: 사회 이슈/정책에 대한 다각적 프레임을 정리하고, 근거 출처와 작성 이력을 함께 저장합니다.
- **문서 ID 규칙**: 날짜+키워드를 결합한 슬러그(`YYYY-MM-DD-topic`) 형태를 권장합니다.

### 8.2 필드 상세 정의

| 필드 경로 | 타입 | 의미 | 예시 값 |
|-----------|------|------|---------|
| `id` | `string` | 문서를 식별하는 슬러그. Firestore 문서 ID와 동일하게 사용하는 것을 권장. | `"2025-10-28-housing-policy"` |
| `title` | `string` | 이슈의 대표 제목. | `"부동산 정책 발표 논란"` |
| `date` | `string (YYYY-MM-DD)` | 이슈가 발생하거나 발표된 날짜. ISO8601 날짜 형식을 사용. | `"2025-10-28"` |
| `summary` | `string` | 이슈를 한 문단으로 요약한 설명. | `"정부의 신규 주택 관련 정책 발표 이후 진보/보수 프레임 충돌"` |
| `summaryFacts` | `array<string>` | 사실 근거 요약. 각 요소는 라벨을 포함한 문장으로 작성. | `["확실한 사실: 2025-10-28 국토부가 ... 발표했다.", "확실한 사실: ..."]` |
| `progressiveFrame.headline` | `string` | 진보 성향 프레임의 핵심 메시지 제목. | `"서민 주거 안정에 꼭 필요했다는 주장"` |
| `progressiveFrame.points` | `array<string>` | 진보 성향 프레임을 설명하는 bullet 리스트. | `["정부가 드디어 시장 왜곡을 바로잡는다는 주장", ...]` |
| `progressiveFrame.note` | `string` | 진보 프레임에 대한 주석. 출처나 확실성 설명 포함. | `"위 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음"` |
| `conservativeFrame.headline` | `string` | 보수 성향 프레임의 핵심 메시지 제목. | `"총선용 퍼주기식 정책이라는 주장"` |
| `conservativeFrame.points` | `array<string>` | 보수 성향 프레임을 설명하는 bullet 리스트. | `["세금으로 시장을 인위적으로 띄운다는 지적", ...]` |
| `conservativeFrame.note` | `string` | 보수 프레임에 대한 주석. 출처나 확실성 설명 포함. | `"위 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음"` |
| `impactToLife.text` | `string` | 생활에 미칠 영향에 대한 분석 또는 의견. 라벨 포함 권장. | `"무주택 30대 입장에서는 ... (ChatGPT의 의견)"` |
| `sources` | `array<object>` | 참고 출처 리스트. 각 요소는 아래와 같은 구조의 객체. | `[{ type: "youtube", ... }]` |
| `sources[].type` | `string ("youtube"\|"official"\|기타)` | 출처 종류. | `"youtube"` |
| `sources[].channelName` | `string` | 채널 혹은 기관명. | `"○○TV"` |
| `sources[].videoDate` | `string (YYYY-MM-DD)` | 콘텐츠 업로드 날짜 또는 발표일. | `"2025-10-28"` |
| `sources[].timestamp` | `string \| null` | 영상의 참조 구간. 값이 없으면 `null`. | `"12:30~13:10"` |
| `sources[].note` | `string` | 출처에 대한 메모 (주장 요약, 참고 이유 등). | `"정책은 결국 서민 지원이라고 주장"` |
| `createdAt` | `Firestore Timestamp` | 문서 최초 생성 시각. 서버에서 `FieldValue.serverTimestamp()` 사용. | 예: `2025-10-28T04:30:00Z` |
| `updatedAt` | `Firestore Timestamp` | 문서 최종 수정 시각. 서버에서 `FieldValue.serverTimestamp()` 사용. | 예: `2025-10-28T05:10:00Z` |

#### 8.2.1 `sources` 필드 구조 예시

```json
{
  "sources": [
    {
      "type": "youtube",
      "channelName": "○○TV",
      "videoDate": "2025-10-28",
      "timestamp": "12:30~13:10",
      "note": "정책은 결국 서민 지원이라고 주장"
    },
    {
      "type": "official",
      "channelName": "국토교통부 브리핑",
      "videoDate": "2025-10-28",
      "timestamp": null,
      "note": "확실한 사실 근거"
    }
  ]
}
```

### 8.3 라벨링 규칙

정보의 신뢰도를 명확히 하기 위해 아래 라벨을 문장 앞에 붙입니다.

- **확실한 사실**: 공식 발표, 확인된 자료 등 객관적으로 검증 가능한 사실.
  - 예: `확실한 사실: 2025-10-28 국토부가 신규 주택 정책을 발표했다.`
- **확실하지 않은 사실**: 추정, 전망, 아직 검증되지 않은 주장.
  - 예: `확실하지 않은 사실: 규제 완화가 집값 급등을 불러올 것이라는 분석이 있다.`
- **ChatGPT의 의견**: 모델이 맥락을 바탕으로 종합한 의견이나 해석.
  - 예: `ChatGPT의 의견: 무주택 30대는 정책 변화에 따라 단기적으로 매수 압박을 받을 수 있다.`

> **주의**: `summaryFacts`, `progressiveFrame.points`, `conservativeFrame.points`, `impactToLife.text` 등 사실 여부가 혼재될 수 있는 필드에는 반드시 해당 라벨을 포함해 작성합니다.

### 8.4 `/admin` 입력 폼과 Firestore 필드 매핑

| `/admin` 폼 필드 라벨 | 입력 형식 | Firestore 저장 필드 | 변환 규칙 |
|-----------------------|-----------|---------------------|-----------|
| 이슈 ID (슬러그) | 텍스트 입력 | `id` | 그대로 저장. Firestore 문서 ID로도 사용 가능. |
| 제목 | 텍스트 입력 | `title` | 그대로 저장. |
| 이슈 날짜 | 날짜 선택 | `date` | `YYYY-MM-DD` 문자열로 변환. |
| 요약 | 멀티라인 텍스트 | `summary` | 그대로 저장. |
| 사실 요약 목록 | 멀티라인 (줄바꿈마다 항목) | `summaryFacts` | 줄바꿈으로 분리 후 배열로 저장. 각 문장 앞에 라벨 포함 확인. |
| 진보 프레임 제목 | 텍스트 입력 | `progressiveFrame.headline` | 그대로 저장. |
| 진보 프레임 포인트 | 멀티라인 텍스트 | `progressiveFrame.points` | 줄바꿈으로 분리 후 배열로 저장. 각 항목에 라벨 포함 여부 검토. |
| 진보 프레임 비고 | 멀티라인 텍스트 | `progressiveFrame.note` | 그대로 저장. |
| 보수 프레임 제목 | 텍스트 입력 | `conservativeFrame.headline` | 그대로 저장. |
| 보수 프레임 포인트 | 멀티라인 텍스트 | `conservativeFrame.points` | 줄바꿈으로 분리 후 배열로 저장. 각 항목에 라벨 포함 여부 검토. |
| 보수 프레임 비고 | 멀티라인 텍스트 | `conservativeFrame.note` | 그대로 저장. |
| 생활 영향 분석 | 멀티라인 텍스트 | `impactToLife.text` | 그대로 저장. 문장 내 라벨 포함. |
| 출처 리스트 | 반복 가능한 입력 그룹 | `sources` | 그룹의 각 항목을 객체로 매핑하여 배열에 저장. |
| ├─ 출처 유형 | 드롭다운 | `sources[].type` | 값 그대로 저장. |
| ├─ 채널/기관명 | 텍스트 입력 | `sources[].channelName` | 그대로 저장. |
| ├─ 영상/발표 날짜 | 날짜 선택 | `sources[].videoDate` | `YYYY-MM-DD` 문자열로 변환. |
| ├─ 타임스탬프 | 텍스트 입력 | `sources[].timestamp` | 입력 없으면 `null`. 범위 형식 `MM:SS~MM:SS` 권장. |
| └─ 비고 | 멀티라인 텍스트 | `sources[].note` | 그대로 저장. |
| 작성/수정 시각 | 자동 처리 | `createdAt`, `updatedAt` | 백엔드에서 `FieldValue.serverTimestamp()`로 설정. |

### 8.5 데이터 검증 체크리스트

1. 모든 리스트 항목에는 라벨(확실한 사실/확실하지 않은 사실/ChatGPT의 의견)이 포함돼 있는지 확인합니다.
2. 날짜 필드는 `YYYY-MM-DD` 형식인지 확인합니다.
3. `sources` 배열의 각 객체는 필수 필드(`type`, `channelName`, `videoDate`, `note`)를 모두 채웠는지 검증합니다.
4. `createdAt`과 `updatedAt`은 클라이언트 시간이 아닌 Firestore 서버 타임스탬프를 사용합니다.

## 9. 배포 전 점검 리스트

- Render 환경 변수에 `FIREBASE_SERVICE_ACCOUNT`가 정확히 입력됐는지 확인합니다.
- `npm start`가 서버 로그에 `서버가 0.0.0.0:PORT에서 실행 중입니다.` 메시지를 출력하는지 확인합니다.
- Netlify 프론트엔드 `.env` 또는 설정 파일에 백엔드 URL이 올바르게 등록돼 있는지 확인합니다.
- README의 스키마 및 라벨링 규칙이 최신 정책과 일치하는지 주기적으로 검토합니다.

