# 사건 프레임 아카이브 v3 아키텍처 개요

## 개요
- **프론트엔드**: Vite + React + Tailwind CSS. 다크 모드 지원(`dark` 클래스 토글)과 Open Graph 메타 태그 주입(react-helmet-async 사용).
- **백엔드**: Express + Firebase Admin SDK. Firestore를 데이터베이스로 사용하며, 간단한 검색 API와 조회수 로깅을 제공.
- **배포 가정**: 프론트는 Netlify, 백엔드는 Render. Firestore는 GCP 프로젝트에 존재한다고 가정.

## 주요 변화 (v3)
1. **검색/필터 API**: `/api/issues/search` 엔드포인트 추가. 최근 50건을 Firestore에서 받아온 뒤 메모리에서 카테고리/키워드 필터 후 최대 20건 반환.
2. **프레임 강도 시각화**: 각 이슈 상세 페이지에서 `IntensityBar` 컴포넌트를 사용해 진보/보수 프레임 강도(0~100)를 시각적으로 표현.
3. **다크 모드 토글**: 헤더에서 테마를 전환하며, 선택은 `localStorage`에 저장. Tailwind `darkMode: 'class'` 설정.
4. **Open Graph 메타 태그**: `MetaTags` 컴포넌트를 통해 페이지별 OG/Twitter 메타 태그 주입. (TODO: SSR 도입 전까지는 일부 SNS에서 인식이 불완전할 수 있음)
5. **조회수 로깅**: `/api/issues/:id` 호출 시 Firestore `metrics` 컬렉션에 `views` 카운트와 `lastViewedAt` 타임스탬프를 기록.

## 데이터 모델 (Firestore)
- **issues** (Collection)
  - `title`: string
  - `date`: string (YYYY-MM-DD)
  - `category`: string (예: 부동산, 노동/노조 등)
  - `summary`: string
  - `summaryFacts`: string[]
  - `progressiveFrame`: object
    - `headline`: string
    - `points`: string[]
    - `note`: string
    - `intensity` (optional): number (0~100)
  - `conservativeFrame`: object
    - `headline`: string
    - `points`: string[]
    - `note`: string
    - `intensity` (optional): number (0~100)
  - `impactToLife`: object { text: string, points: string[] }
  - `sources`: array of { type, channelName, videoDate, timestamp, note }
  - `createdAt`, `updatedAt`: Firestore Timestamp

- **metrics** (Collection)
  - 문서 ID: issueId
  - `views`: number (증분 저장)
  - `lastViewedAt`: Firestore serverTimestamp
  - TODO: 악성 호출 방지를 위해 rate limiting 및 인증 필요.

## 백엔드 라우팅
- `GET /api/issues`: 최근 20건 목록 (카드용 데이터)
- `GET /api/issues/search?category=&query=`: 서버 측 필터/검색 결과 반환
- `GET /api/issues/:id`: 단일 이슈 상세 + metrics 조회수 증가
- `POST /api/issues`: 관리자 입력용 저장 (현재는 인증 없음, 추후 `x-admin-secret` 검사 예정)

## 프론트엔드 페이지 구조
- `HomePage`: 검색/필터 폼 → `/api/issues/search` 호출, 결과 카드 렌더.
- `IssuePage`: 상세 데이터를 불러와 InfoBlock + IntensityBar 구성. 공유 버튼과 출처 목록 포함.
- `AdminPage`: 입력 폼 + 실시간 미리보기. 강도 값 입력 지원.
- 공용 컴포넌트: `SiteHeader`, `SiteFooter`, `IssueCard`, `InfoBlock`, `IntensityBar`, `MetaTags`.

## 인증 흐름 (임시)
- `POST /api/issues` 요청 시 `x-admin-secret` 헤더를 검사할 예정이라는 주석이 코드에 남아 있음. 현재는 실제 검증이 없으므로 운영 전 강화 필요.

## TODO / 향후 고려사항
- 검색 기능을 Firestore 인덱스 또는 전문 검색 서비스(Algolia 등)로 교체하여 성능 개선.
- SSR 또는 프리렌더링을 도입해 Open Graph 메타 태그가 SNS 크롤러에 확실히 노출되도록 개선.
- 조회수 로깅에 대한 rate limiting, 인증, IP 기반 필터링 도입.
- 관리자 인증 시스템(로그인 페이지, JWT/세션 등) 마련.
