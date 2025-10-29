# 배포 가이드 (Netlify + Firestore)

현재 애플리케이션은 React/Vite 프런트엔드가 Firestore Web SDK로 직접 CRUD를 수행하는 구조다. Render/Express 서버는 런타임에서 사용되지 않는다.

## 1. 환경 변수 설정

Netlify 혹은 Vercel과 같은 정적 호스팅 서비스에 배포할 때 다음 Vite 환경 변수를 설정한다.

| 변수 | 설명 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase 프로젝트 API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | 프로젝트 ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 메시징 ID |
| `VITE_FIREBASE_APP_ID` | App ID |

> ❗ `VITE_API_BASE_URL`과 `VITE_ADMIN_SECRET`은 현재 미사용이다. 과거 Render 백엔드와의 호환성을 위해 남겨둔 값이다.

## 2. 빌드 및 배포

```bash
npm install
npm run build
```

생성된 `dist/` 폴더를 Netlify에 업로드하거나 CI/CD를 이용해 자동 배포한다. Firestore Web SDK는 브라우저에서 실행되므로 별도의 서버 프로세스가 필요 없다.

## 3. Firestore Security Rules (DEV → PROD)

DEV 단계에서는 아래와 같은 완전 개방 규칙을 가정한다.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /issues/{docId} {
      allow read: if true;
      allow write: if true; // DEV ONLY
    }
    match /metrics/{issueId} {
      allow read: if true;
      allow write: if true; // DEV ONLY
    }
  }
}
```

프로덕션 전환 시에는 반드시 아래 항목을 수행해야 한다.

1. Firebase Authentication(또는 다른 인증 체계)을 도입해 관리자만 쓰기 가능하도록 한다.
2. Firestore Rules에서 `allow write: if request.auth != null` 등의 조건을 추가한다.
3. /admin 라우트를 보호(비밀번호/IDP)하고, 필요 시 Render/Express 백엔드를 부활시켜 서버에서만 쓰기를 허용하는 구조로 변경한다.

## 4. 추가 TODO

- 조회수(metrics) 추적은 현재 프런트에서 수행하지 않는다. 추후 Cloud Functions 또는 인증된 서버를 통해 안전하게 구현할 계획이다.
- 배포 URL이 외부에 알려지면 누구든지 /admin 페이지에 접근할 수 있으므로, DEV 환경에서는 URL을 공유하지 말 것.
