# 배포 가이드 (리뉴얼 기준)

## 1. 개요
- **프론트엔드**: `frontend/` (Vite + React + Tailwind, dark mode = class 기반)
- **백엔드**: `backend/` (Express + Firebase Admin)
- **데이터베이스**: Firestore (`issues`, `metrics` 컬렉션 사용)

## 2. Netlify (프론트)
1. Netlify에서 새 사이트를 생성하고 `frontend/` 디렉터리를 빌드 대상으로 지정합니다.
2. Build command: `npm run build`, Publish directory: `dist`
3. 환경 변수 설정
   - `VITE_API_BASE_URL = https://<render-backend-domain>/api`
   - `VITE_ADMIN_SECRET = <백엔드 ADMIN_SECRET과 동일>`
4. 다크 모드 토글은 `<html>`에 `dark` 클래스를 붙이는 방식이며, 사용자의 선택은 `localStorage`에 저장됩니다.
5. SPA에서 메타 태그를 주입하므로 일부 SNS 미리보기가 동작하지 않을 수 있습니다. TODO: 장기적으로 SSR/프리렌더 도입 검토.

## 3. Render (백엔드)
1. **New Web Service** 생성 → `backend/` 디렉터리 사용
2. Build command: `npm install`
3. Start command: `npm start`
4. 환경 변수
   - `PORT` (Render 기본값 사용)
   - `FIREBASE_SERVICE_ACCOUNT` (서비스 계정 JSON 문자열 전체)
   - `ADMIN_SECRET` (프론트와 동일한 비밀 값)
5. 배포 후 API 엔드포인트 예시: `https://<render-domain>/api`

## 4. Tailwind & 다크 모드
- `frontend/tailwind.config.js`에서 `darkMode: 'class'`로 설정되어 있습니다.
- `SiteHeader` 컴포넌트가 테마 토글을 담당하며, 로컬 스토리지 키 `efa-theme-preference`에 사용자 선호를 저장합니다.

## 5. Open Graph 메타 태그
- `MetaTags` 컴포넌트가 `react-helmet-async`로 `<head>`에 태그를 삽입합니다.
- SPA 특성상 모든 SNS에서 즉시 반영되지는 않습니다. TODO: SSR 또는 정적 프리렌더링 방식을 추후 도입해야 합니다.

## 6. 로컬 개발 체크
```bash
# 백엔드
cd backend
npm install
npm run dev

# 프론트엔드
cd frontend
npm install
npm run dev
```
- 프론트는 `frontend/src/config.js`에서 개발 환경일 때 자동으로 `http://localhost:5000/api`를 사용합니다.

## 7. 보안 메모
- `/api/issues` POST는 `x-admin-secret` 헤더를 검사합니다. 현재는 단일 비밀번호 방식이므로, 실제 운영 시 OAuth/세션 등 강력한 인증을 추가해야 합니다.
- `metrics` 컬렉션은 단순 카운터라서 반복 호출에 취약합니다. TODO 주석을 참고해 Rate Limit 도입을 검토하세요.

