# 배포 가이드 (v3)

## 1. 개요
- 프론트엔드: `frontend/` (Vite + React + Tailwind). 다크 모드 토글과 Open Graph 메타 태그가 포함되어 있습니다.
- 백엔드: `backend/` (Express + Firebase Admin). `/api/issues/search` 검색 API와 조회수 로깅이 추가되었습니다.
- 데이터베이스: Firestore. `issues`, `metrics` 컬렉션을 사용합니다.

## 2. Netlify 설정 (프론트엔드)
1. Netlify에서 **Add new site → Import an existing project**를 선택한 뒤 저장소를 연결합니다.
2. Build command: `npm run build`, Publish directory: `dist` (루트는 `frontend/`).
3. **Environment variables**에서 다음 값을 설정합니다.
   - `VITE_API_BASE_URL`: Render에 배포된 백엔드의 베이스 URL 예) `https://your-render-app.onrender.com/api`
   - `VITE_ADMIN_SECRET`: 임시 관리자 키. ⚠️ Vite 빌드 결과에 포함되므로 민감한 키를 여기 두면 누구나 확인할 수 있습니다.
4. Deploy 후, 다크 모드 토글 상태는 `localStorage`에 저장되어 방문자가 새로고침해도 유지됩니다.
5. TODO: 현재는 클라이언트에서 메타 태그를 삽입하므로, 일부 SNS 크롤러가 OG 정보를 읽지 못할 수 있습니다. 추후 SSR/프리렌더링 도입을 검토하세요.

## 3. Render 설정 (백엔드)
1. Render에서 **New + → Web Service**를 선택하고 `backend/` 디렉터리를 지정합니다.
2. Build Command: `npm install`, Start Command: `npm start`.
3. **Environment** 섹션에 다음 변수를 추가합니다.
   - `PORT`: Render가 자동으로 할당하므로 별도 값 없이 두거나 `${PORT}`를 사용합니다.
   - `FIREBASE_SERVICE_ACCOUNT`: Firebase 서비스 계정 JSON 전체 문자열.
   - `ADMIN_SECRET`: 서버에서 검증할 관리자 비밀 값 (추후 `x-admin-secret` 검사에 활용 예정).
4. 배포 후 API 엔드포인트는 `https://<render-domain>/api` 형식으로 접근합니다.

## 4. Tailwind & 다크 모드 메모
- `frontend/tailwind.config.js`에 `darkMode: 'class'`가 설정되어 있습니다. 다크 모드는 `<html>` 요소에 `dark` 클래스를 추가/제거하여 동작합니다.
- `SiteHeader` 컴포넌트가 테마 토글을 담당하며, 사용자 선택을 `localStorage`에 저장합니다.

## 5. Open Graph 메타 태그
- `MetaTags` 컴포넌트가 react-helmet-async를 사용해 `<head>`에 메타 태그를 삽입합니다.
- Netlify는 SPA 호스팅이므로, 일부 SNS에서 미리보기를 생성하려면 SSR 또는 Netlify Edge Functions 기반의 프리렌더링을 추가로 구성해야 합니다.

## 6. 로컬 개발
```bash
# 백엔드
cd backend
npm install
npm start

# 프론트엔드
cd frontend
npm install
npm run dev
```
- 로컬 환경에서는 `.env` 또는 `frontend/src/config.js`를 통해 `API_BASE_URL`을 `http://localhost:5000/api`로 설정합니다.

## 7. 주의사항
- 관리자 기능 보호를 위해 `x-admin-secret` 기반 검증을 백엔드에서 반드시 구현하세요. 현재는 주석만 존재하며 실제 검증은 비활성화 상태입니다.
- Firestore `metrics` 컬렉션은 단순 카운터이므로, 악성 반복 호출을 막기 위한 rate limiting/인증 로직을 추가해야 합니다.
