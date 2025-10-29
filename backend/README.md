# LR Policy 백엔드 서버 (레거시 초안)

> **중요 안내**
>
> 현재 프론트엔드는 Firestore Web SDK를 통해 직접 `issues` 문서를 읽고 쓰는 구조다.
> 따라서 이 Express 서버(Render 배포)는 런타임에서 사용되지 않으며, 향후 보안 강화를 위해 남겨둔 레거시 초안이다.
> TODO: 프로덕션 단계에서는 Firestore 보안 규칙을 잠그고 `/admin` 접근을 제한한 뒤, 쓰기 작업은 이 서버에서만 처리하도록 전환해야 한다.

## 1. 폴더 구조

```
/backend
  ├── server.js              # Express 진입점 (현재 비활성, 주석으로 상황 설명)
  ├── firebaseAdmin.js       # Firebase Admin 초기화 (서비스 계정 필요)
  ├── routes/
  │   └── issues.js          # 정책/사건 CRUD 라우트 (현재 사용 안 함)
  ├── package.json
  ├── .env.example           # 환경 변수 예시 (현재는 참고용)
  └── README.md              # 본 문서
```

## 2. 현재 상태 요약

- 프론트(React/Vite)는 Firestore Web SDK를 통해 `getDocs`, `addDoc`, `updateDoc`, `deleteDoc`을 직접 호출한다.
- Render/Express 서버는 더 이상 배포하지 않아도 된다.
- 보안 규칙은 개발 편의상 `allow read, write: if true;`라고 가정하고 있으며, 공개 배포 전에 반드시 잠가야 한다.
- 이 서버 코드는 *향후* 인증/권한 제어를 추가하고, Firestore 쓰기를 안전하게 프록시하기 위해 남겨둔 것이다.

## 3. 환경 변수(.env) 참고

`.env.example`에 다음 값이 포함되어 있다. 실제 운영에는 사용되지 않지만, 레거시 서버를 재활성화할 때 필요하다.

| 변수명 | 설명 |
| --- | --- |
| `PORT` | Express 서버 포트 (기본 5000) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 서비스 계정 JSON 전체 문자열 |
| `ADMIN_SECRET` | 관리자 인증 토큰 (현재 사용 안 함) |

## 4. 로컬 실행(참고용)

향후 서버를 복구해야 할 경우에만 아래 절차를 따른다.

1. `cd backend`
2. `npm install`
3. `.env` 생성 후 환경 변수를 입력
4. `npm run dev`
5. `GET http://localhost:5000/api/issues` 응답 확인 (현재는 프론트에서 직접 Firestore를 호출하므로 사용되지 않음)

## 5. 추후 전환 TODO

- Firestore Security Rules를 최소 권한으로 재작성하고, 익명 쓰기를 금지한다.
- `/admin` 경로 접근 자체에 인증/인가를 붙인다.
- 쓰기 작업(create/update/delete)은 이 서버의 보호된 엔드포인트에서만 수행하도록 프론트 구조를 다시 조정한다.
- metrics(조회수) 집계, 감사 로그 등 부가 기능은 Cloud Functions 또는 백엔드에서 처리한다.

현재로서는 위 TODO를 실행하기 전까지 이 서버를 배포할 필요가 없다.
