# LR Policy 백엔드 서버 & Firestore 운영 가이드

이 문서는 Express + Firebase Admin으로 구성된 백엔드 서버를 설정하고, Firestore에 정책/사건 데이터를 저장하는 전체 흐름을 설명합니다. 비전공자도 배포와 운영을 따라 할 수 있도록 단계별로 정리했습니다.

## 1. 폴더 구조

```
/backend
  ├── server.js              # Express 진입점, CORS 및 라우팅 설정
  ├── firebaseAdmin.js       # Firebase Admin 초기화 (서비스 계정 필요)
  ├── routes/
  │   └── issues.js          # 정책/사건 CRUD 라우트
  ├── package.json
  ├── .env.example           # 필수 환경변수 예시
  └── README.md              # 현재 문서
```

## 2. 준비물

1. **Node.js 18 LTS 이상** (로컬 및 Render 모두 해당 버전을 권장)
2. **Firebase 프로젝트** 및 **서비스 계정 키(JSON)**
3. **Firestore Database**가 활성화되어 있어야 함
4. 관리용 비밀번호 `ADMIN_SECRET` 값 (프론트 `VITE_ADMIN_SECRET`과 동일하게 맞춰야 함)

## 3. 환경 변수 설정 (.env)

`.env.example`을 참고하여 `.env` 파일을 만들거나 Render 대시보드에 동일 값을 등록합니다.

| 변수명 | 설명 | 예시 |
| --- | --- | --- |
| `PORT` | 서버가 청취할 포트 번호. Render에서는 플랫폼이 자동 설정한 값을 사용 | `5000` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 서비스 계정 JSON 전체 문자열 (줄바꿈은 `\n`으로 그대로 유지) | `{ "type": "service_account", ... }` |
| `ADMIN_SECRET` | `/api/issues` POST 호출 시 사용할 관리자 비밀번호 | `super-secret-token` |

> **주의**: `.env` 파일은 Git에 커밋하지 않도록 `.gitignore`에 등록되어 있습니다.

## 4. 로컬 개발 순서

1. `cd backend`
2. 의존성 설치: `npm install`
3. `.env` 파일 생성 후 위 표의 환경 변수를 입력
4. 개발 서버 실행: `npm run dev`
5. 브라우저에서 `http://localhost:5000/api/issues` 호출 시 JSON 배열이 보이면 성공

## 5. Render 배포 가이드

1. Render 대시보드에서 **New Web Service** 생성 후 GitHub 저장소 연결
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**에 다음 값 입력
   - `PORT` : Render 기본값 (예: `10000`) 사용
   - `FIREBASE_SERVICE_ACCOUNT` : 서비스 계정 JSON 전체 문자열
   - `ADMIN_SECRET` : 프론트엔드와 동일한 비밀 값
5. 배포 후 Render가 제공하는 URL 예시: `https://lr-policy-backend.onrender.com`
6. 헬스 체크: `GET https://.../` 엔드포인트는 `{ message: 'LR Policy 백엔드 API가 정상 동작 중입니다.' }` 응답

## 6. CORS

`server.js`에서 `origin` 배열에 **로컬 개발 도메인**과 **Netlify 배포 도메인**을 명시합니다. 예시:

```js
const corsOptions = {
  origin: ['http://localhost:5173', 'https://your-netlify-domain.netlify.app'],
  allowedHeaders: ['Content-Type', 'x-admin-secret']
};
```

Netlify URL을 실제 도메인으로 바꾸면 프론트에서 API를 호출할 수 있습니다.

## 7. API 요약

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/issues` | 최신 20개의 정책/사건 카드용 데이터 반환 (title/date/category/summaryCard) |
| `GET` | `/api/issues/search?category=&query=` | 카테고리/검색어 기반 필터링. Firestore에서 최근 50개 불러와 메모리 필터링 |
| `GET` | `/api/issues/:id` | 전체 필드를 포함한 상세 문서를 반환하고, `metrics/{issueId}`에 조회수 증가 |
| `POST` | `/api/issues` | 신규 이슈 생성. `x-admin-secret` 헤더 필수 (TODO: 실제 서비스에서는 더 강력한 인증 필요) |

### 7.1 POST /api/issues 요청 포맷

```json
{
  "title": "사건/정책 제목",
  "date": "2025-10-29",
  "category": "부동산",
  "summaryCard": "홈 화면 카드용 1~2문장 요약",
  "background": "사건/정책의 맥락과 확인된 사실을 기사처럼 정리",
  "keyPoints": ["핵심 bullet 1", "핵심 bullet 2"],
  "progressiveView": {
    "headline": "정부 개입은 서민 보호에 필수",
    "bullets": ["진보 진영 bullet"],
    "note": "아래 내용은 일부 진보적 시각..."
  },
  "progressiveIntensity": 70,
  "conservativeView": {
    "headline": "이건 선거용 퍼주기 정책이다",
    "bullets": ["보수 진영 bullet"],
    "note": "아래 내용은 일부 보수적 시각..."
  },
  "conservativeIntensity": 55,
  "impactToLife": {
    "text": "생활 영향 요약",
    "note": "이 섹션은 중립적 해석... (ChatGPT의 의견)"
  },
  "sources": [
    {
      "type": "official",
      "channelName": "국토교통부",
      "sourceDate": "2025-10-29",
      "timestamp": null,
      "note": "발표 내용 요약"
    }
  ]
}
```

### 7.2 응답 예시

```json
{
  "id": "generated-firestore-id",
  "title": "사건/정책 제목",
  "date": "2025-10-29",
  "category": "부동산",
  "summaryCard": "홈 화면 카드용 1~2문장 요약",
  "background": "...",
  "keyPoints": ["..."],
  "progressiveView": { "headline": "...", "bullets": ["..."], "note": "..." },
  "progressiveIntensity": 70,
  "conservativeView": { "headline": "...", "bullets": ["..."], "note": "..." },
  "conservativeIntensity": 55,
  "impactToLife": { "text": "...", "note": "..." },
  "sources": [{ "type": "official", "channelName": "국토교통부", ... }],
  "createdAt": {"_seconds": 1698556800, ...},
  "updatedAt": {"_seconds": 1698556800, ...}
}
```

## 8. Firestore 데이터 구조 요약

- **컬렉션명**: `issues`
- **필수 필드**: `title`, `date`, `category`, `summaryCard`, `background`, `keyPoints[]`
- **선택 필드**: `progressiveView`, `conservativeView`, `impactToLife`, `sources[]`, `progressiveIntensity`, `conservativeIntensity`
- **시스템 필드**: `createdAt`, `updatedAt` (서버 타임스탬프)
- **메트릭스**: `metrics/{issueId}` 문서에 `views`(숫자), `lastViewedAt`(타임스탬프) 저장

## 9. 데이터 검증 체크리스트

1. `background`는 사실 기반 설명인지 확인합니다.
2. `keyPoints`는 줄바꿈으로 분리된 bullet이며 최소 1개 이상인지 확인합니다.
3. `progressiveView`/`conservativeView`는 헤드라인과 bullet이 모두 비어 있으면 저장하지 않습니다.
4. `impactToLife`는 텍스트가 있을 때만 저장합니다.
5. `sources`는 `type|channelName|sourceDate|timestamp|note` 형식으로 파싱되며, 채널명이 비어 있으면 제외됩니다.
6. `progressiveIntensity`, `conservativeIntensity` 값은 0~100 범위의 정수로 자동 보정됩니다.

## 10. 운영 팁

- Admin 페이지는 작성 중인 내용을 `localStorage`에 저장하므로 실수로 새로고침해도 복구가 가능합니다.
- `ADMIN_SECRET`는 임시 보안 장치입니다. 실제 서비스에서는 사용자 인증/인가 체계를 반드시 추가해야 합니다.
- 배포 후에는 Netlify 환경변수 `VITE_API_BASE_URL`을 Render 백엔드 URL로 설정해야 프론트가 데이터를 불러옵니다.

