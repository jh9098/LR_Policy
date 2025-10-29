# LR Policy 백엔드 서버 (레거시 초안)

> ⚠️ **중요:** 현재 운영 흐름은 React 프런트엔드가 Firestore Web SDK로 직접 CRUD를 수행하는 구조다. 이 Express 서버는 런타임에서 사용되지 않으며, 향후 보안 강화를 위해 참고용으로만 남겨 둔 코드다. TODO: 프로덕션 전환 시 /admin 접근 제한, Firestore Security Rules 잠금, 서버 사이드 쓰기 전용 구조를 도입해야 한다.

## 1. 폴더 구조

```
/backend
  ├── server.js              # Express 진입점 (현재 비활성 상태)
  ├── firebaseAdmin.js       # Firebase Admin 초기화 (서비스 계정 필요)
  ├── routes/
  │   └── issues.js          # 정책/사건 CRUD 라우트 (레거시 참고용)
  ├── package.json
  ├── .env.example           # 환경 변수 예시 (서버 부활 시 사용)
  └── README.md              # 현재 문서
```

## 2. 레거시 서버를 다시 사용해야 한다면

1. **Node.js 18 LTS 이상**과 `npm install` 준비.
2. Firebase 프로젝트에서 **서비스 계정 키(JSON)** 를 발급받아 `.env` 파일의 `FIREBASE_SERVICE_ACCOUNT` 값으로 넣는다.
3. `.env` 파일에는 `PORT`, `FIREBASE_SERVICE_ACCOUNT`, (선택) `ADMIN_SECRET`을 설정한다.
4. `npm run dev` 또는 Render 배포를 통해 서버를 실행한다.
5. `/api/issues` 라우트는 easySummary를 포함한 전체 스키마를 Firestore에 저장/조회한다.

## 3. 현재 상태에서의 주석

- `server.js`: CORS, 라우팅이 정의되어 있으나 프론트는 더 이상 이 엔드포인트를 호출하지 않는다.
- `routes/issues.js`: GET/POST/PUT/DELETE 라우트가 모두 존재하지만 **모두 레거시 참고용**이다. 실제 CRUD는 `src/firebaseClient.js`에서 처리한다.
- `firebaseAdmin.js`: 서비스 계정 기반 Firestore Admin SDK 초기화 코드. 서버를 다시 사용할 때만 필요하다.
- `.env.example`: 서버 재활성화를 대비한 환경 변수 예시. 현재 배포에서는 사용하지 않는다.

## 4. 향후 계획 (TODO)

1. **인증/인가** – Firebase Authentication 또는 별도 인증 서버를 붙여 `/admin` 접근을 보호한다.
2. **보안 규칙 강화** – Firestore Rules에서 익명 쓰기를 금지하고, 서버에서만 쓰기를 허용하는 구조를 구성한다.
3. **감사 로그** – 서버에서만 문서를 수정하도록 전환하면, 추후 감사 로그/버전 관리도 함께 도입한다.
4. **metrics 처리** – 조회수 등 메트릭을 서버에서 안전하게 증가시키도록 Cloud Functions 혹은 Express 서버를 활용한다.

현재로서는 이 디렉터리를 그대로 두고, 프런트엔드의 Firestore 직행 구조를 유지하면 된다. 보안 작업을 시작할 때 이 README와 소스 코드를 참고해 서버를 다시 활성화하면 된다.
