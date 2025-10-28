// frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import HomePage from './pages/HomePage.jsx';
import IssuePage from './pages/IssuePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-20 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/issue/:id" element={<IssuePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
