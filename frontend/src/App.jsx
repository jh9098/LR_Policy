// frontend/src/App.jsx
// 라우팅 구성. 모든 페이지가 Firestore Web SDK를 직접 사용하도록 연결되어 있으며 Render 백엔드는 호출하지 않는다.

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import IssuePage from './pages/IssuePage.jsx';
import AdminNewPage from './pages/admin/AdminNewPage.jsx';
import AdminListPage from './pages/admin/AdminListPage.jsx';
import AdminEditPage from './pages/admin/AdminEditPage.jsx';

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
        <Route path="/issue/:id" element={<IssuePage />} />
      </Route>

      {/* 관리자는 별도 레이아웃을 사용한다. SiteHeader/SiteFooter를 중복 렌더링하지 않도록 Outlet 구조를 구성한다. */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="new" replace />} />
        <Route path="new" element={<AdminNewPage />} />
        <Route path="list" element={<AdminListPage />} />
        <Route path="edit/:id" element={<AdminEditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
