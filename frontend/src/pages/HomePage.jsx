// frontend/src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from 'react';
import IssueCard from '../components/IssueCard.jsx';
import { API_BASE_URL } from '../config.js';

const CATEGORY_OPTIONS = ['전체', '부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];

function normalizeIssue(issue) {
  return {
    id: issue.id ?? '',
    title: issue.title ?? '',
    date: issue.date ?? '',
    summary: issue.summary ?? '',
    category: issue.category ?? '기타'
  };
}

function HomePage() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [draftCategory, setDraftCategory] = useState('전체');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('전체');
  const [appliedSearch, setAppliedSearch] = useState('');

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

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchCategory = appliedCategory === '전체' || issue.category === appliedCategory;
      const lowerSearch = appliedSearch.trim().toLowerCase();

      if (!lowerSearch) {
        return matchCategory;
      }

      const combinedText = `${issue.title} ${issue.summary}`.toLowerCase();
      const matchSearch = combinedText.includes(lowerSearch);

      return matchCategory && matchSearch;
    });
  }, [issues, appliedCategory, appliedSearch]);

  const handleApplyFilters = () => {
    setAppliedCategory(draftCategory);
    setAppliedSearch(draftSearch);
  };

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">최근 사건</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            사건별로 서로 다른 프레임을 비교합니다. 좌/우 프레임을 한 화면에서 보고 스스로 판단하세요.
          </p>
        </div>
        <aside className="inline-flex min-w-[180px] flex-col gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-700">
          <span className="text-sm font-semibold">베타 서비스</span>
          <span>데이터는 일부 수동 정리 중입니다.</span>
        </aside>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">필터 &amp; 검색</h2>
        <p className="mt-1 text-sm text-slate-600">카테고리와 키워드로 원하는 사건을 빠르게 찾아보세요.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[200px,1fr,auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            카테고리
            <select
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            검색어
            <input
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="제목 또는 요약에서 검색"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              적용
            </button>
          </div>
        </div>
      </section>

      {isLoading && <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredIssues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              조건에 맞는 사건이 없습니다. 필터를 조정해 보세요.
            </div>
          ) : (
            filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      )}
    </section>
  );
}

export default HomePage;
