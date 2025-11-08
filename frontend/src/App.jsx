// frontend/src/App.jsx
// 라우팅 구성. 모든 CRUD는 firebaseClient.js를 통해 Firestore에 직접 접근한다.

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import HomePage from './pages/HomePage.jsx';
import IssuePage from './pages/IssuePage.jsx';
import ThemePage from './pages/ThemePage.jsx';
import AdminNewPage from './pages/admin/AdminNewPage.jsx';
import AdminListPage from './pages/admin/AdminListPage.jsx';
import AdminEditPage from './pages/admin/AdminEditPage.jsx';
import CompanyInfoPage from './pages/static/CompanyInfoPage.jsx';
import PartnershipInfoPage from './pages/static/PartnershipInfoPage.jsx';
import AdvertisingInfoPage from './pages/static/AdvertisingInfoPage.jsx';
import TermsPage from './pages/static/TermsPage.jsx';
import PrivacyPolicyPage from './pages/static/PrivacyPolicyPage.jsx';
import YouthProtectionPolicyPage from './pages/static/YouthProtectionPolicyPage.jsx';

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors dark:bg-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-20 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/theme/:themeId" element={<ThemePage />} />
        <Route path="/issue/:id" element={<IssuePage />} />
        <Route path="/company" element={<CompanyInfoPage />} />
        <Route path="/partnership" element={<PartnershipInfoPage />} />
        <Route path="/advertising" element={<AdvertisingInfoPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/youth-protection" element={<YouthProtectionPolicyPage />} />
        {/* ↓↓↓ 추가: 알 수 없는 경로는 홈으로 유도하거나 404 컴포넌트로 연결 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<AdminNewPage />} />
        <Route path="list" element={<AdminListPage />} />
        <Route path="edit/:id" element={<AdminEditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
