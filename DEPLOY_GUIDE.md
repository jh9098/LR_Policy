# 배포 가이드

## 1. GitHub 레포 구조
```
/
├── frontend/  # Vite + React + Tailwind 기반 프론트엔드
└── backend/   # Node.js + Express 백엔드 (Firestore 연동)
```

## 2. Netlify 배포 절차
1. Netlify에 로그인한 뒤 **Add new site → Import an existing project**를 선택합니다.
2. GitHub 저장소를 연결한 다음, `frontend/` 디렉터리를 배포 대상으로 지정합니다.
3. Build command에는 `npm run build`, Publish directory에는 `dist`를 입력합니다.
4. **Site settings → Build & deploy → Environment → Edit variables**로 이동해 환경 변수를 추가합니다.
   - `API_BASE_URL` 키에 Render로 배포된 백엔드의 `https://<render-domain>/api` 값을 입력합니다.
5. 저장 후 배포를 실행하면, 프론트엔드가 Netlify에 호스팅됩니다.

## 3. Render 배포 절차
1. Render에 로그인 후 **New + → Web Service**를 선택하고 GitHub 저장소를 연결합니다.
2. `backend/` 디렉터리를 선택해 Node.js 웹 서비스로 배포를 진행합니다.
3. Build Command는 `npm install`, Start Command는 `npm start`(또는 `node server.js`)로 설정합니다.
4. **Environment** 섹션에서 다음 환경 변수를 추가합니다.
   - `PORT`: Render에서 할당한 포트를 사용하도록 그대로 비워두면 자동으로 주입됩니다. 필요 시 `${PORT}` 값을 사용하세요.
   - `FIREBASE_SERVICE_ACCOUNT`: Firebase 콘솔에서 발급받은 서비스 계정 JSON 전체를 문자열로 복사해 그대로 입력합니다. (줄바꿈과 공백을 모두 포함)
5. `serviceAccountKey.json` 파일은 GitHub에 업로드하지 말고, 반드시 `FIREBASE_SERVICE_ACCOUNT` 환경 변수에 JSON 문자열을 직접 넣어 안전하게 관리합니다.
6. Deploy를 완료하면 Render가 `https://<render-domain>` 주소를 제공하며, API는 `https://<render-domain>/api` 형태로 접근 가능합니다.

## 4. 로컬 개발 방법
1. **백엔드**
   ```bash
   cd backend
   npm install
   npm start # 또는 node server.js
   ```
2. **프론트엔드**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. 프론트엔드의 `.env` 또는 `src/config.js`에서 `API_BASE_URL`을 `http://localhost:5000/api`로 설정하면 로컬 개발 환경에서 API가 연동됩니다.

## 5. 보안 및 주의사항
- 현재 `POST /api/issues` 엔드포인트는 별도의 인증이 없어 외부에서 임의 호출이 가능합니다. 추후 AdminPage에서만 사용할 수 있도록 비밀 토큰 헤더 등 간단한 보호 장치를 추가할 예정임을 명시하고, 운영 시에는 반드시 보안 대책을 마련하세요.
- 정치/시사 이슈를 다루는 서비스 특성상, 각 프레임 설명에 "확실하지 않은 사실" 등과 같은 라벨을 항상 노출해 사용자가 주장과 사실을 명확히 구분할 수 있도록 해야 합니다. 이는 잘못된 정보 확산을 최소화하고, 서비스의 객관성을 유지하기 위한 중요한 장치입니다.
