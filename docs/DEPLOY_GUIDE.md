# 배포 가이드 (운영 대시보드 포함)

## 1. 개요
- **프론트엔드**: `frontend/` (Vite + React + Tailwind, dark mode = class 기반)
- **백엔드**: `backend/` (Express + Firebase Admin)
- **데이터베이스**: Firestore (`issues`, `metrics` 컬렉션 사용)

## 2. Netlify (프론트)
1. Netlify에서 새 사이트를 생성하고 `frontend/` 디렉터리를 빌드 대상으로 지정합니다.
2. Build command: `npm run build`, Publish directory: `dist`
3. 환경 변수 설정
   - `VITE_API_BASE_URL = https://<render-backend-domain>/api`
   - `VITE_ADMIN_SECRET = <선택 사항, 나중에 인증을 붙일 때 사용>`
4. 다크 모드는 `<html>`에 `dark` 클래스를 붙이는 방식이며, 사용자의 선택은 `localStorage`에 저장됩니다.
5. SPA 특성상 일부 SNS 미리보기가 동작하지 않을 수 있습니다. TODO: 장기적으로 SSR/프리렌더 도입 검토.

## 3. Render (백엔드)
1. **New Web Service** 생성 → `backend/` 디렉터리 사용
2. Build command: `npm install`
3. Start command: `npm start`
4. 환경 변수
   - `PORT` (Render 기본값 사용)
   - `FIREBASE_SERVICE_ACCOUNT` (서비스 계정 JSON 문자열 전체)
   - `ADMIN_SECRET` (선택 사항. 현재는 검증하지 않지만 추후 인증 시 재활성화 예정)
5. 배포 후 API 엔드포인트 예시: `https://<render-domain>/api`

> ⚠️ 현재는 인증이 비활성화되어 있으므로 Render 인스턴스 URL을 외부에 공개하지 마세요.

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
- `/admin` 라우트와 `POST/PUT/DELETE /api/issues`는 현재 누구나 호출할 수 있습니다. TODO 주석을 참고해 운영 전까지 인증을 추가하세요.
- `metrics` 컬렉션은 단순 카운터라 반복 호출에 취약합니다. Rate Limit 또는 Cloud Functions 기반 검증을 도입해야 합니다.

> TODO: 운영 단계에서 `VITE_ADMIN_SECRET`과 `ADMIN_SECRET`을 다시 활성화하여 헤더 기반 검증 또는 OAuth/세션 방식을 추가합니다.
