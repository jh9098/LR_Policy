// frontend/src/pages/HomePage.jsx
import { useEffect, useState } from 'react';
import IssueCard from '../components/IssueCard.jsx';
import { API_BASE_URL } from '../config.js';

function normalizeIssue(issue) {
  return {
    id: issue.id ?? '',
    title: issue.title ?? '',
    date: issue.date ?? '',
    summary: issue.summary ?? ''
  };
}

function HomePage() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchIssues() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/issues`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('이슈 목록을 불러오지 못했습니다.');
        }

        const data = await response.json();
        const normalized = Array.isArray(data) ? data.map(normalizeIssue).filter((item) => item.id) : [];
        setIssues(normalized);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchIssues();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">최근 사건</h1>
        <p className="text-sm text-slate-600">
          주요 이슈에 대해 진보/보수 프레임을 한눈에 비교할 수 있도록 모아둔 아카이브입니다.
        </p>
      </header>

      {isLoading && <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!isLoading && !error && (
        <div className="grid gap-5 md:grid-cols-2">
          {issues.length === 0 ? (
            <p className="text-sm text-slate-500">표시할 이슈가 없습니다.</p>
          ) : (
            issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      )}
    </section>
  );
}

export default HomePage;
