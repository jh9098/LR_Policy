// frontend/src/App.jsx
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import IssuePage from './pages/IssuePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-semibold text-slate-900">
            사건 프레임 아카이브
          </Link>
          <nav className="space-x-4">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              홈
            </Link>
            <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              관리자 입력
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/issue/:id" element={<IssuePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
