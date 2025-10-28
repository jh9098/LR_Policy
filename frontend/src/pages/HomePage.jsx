// frontend/src/pages/HomePage.jsx
import { useCallback, useEffect, useState } from 'react';
import IssueCard from '../components/IssueCard.jsx';
import MetaTags from '../components/MetaTags.jsx';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [draftCategory, setDraftCategory] = useState('전체');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('전체');
  const [appliedSearch, setAppliedSearch] = useState('');

  const fetchIssues = useCallback(async ({ categoryValue, queryValue }) => {
    // 백엔드 검색 API 를 호출하여 서버 측 필터링 결과를 가져온다.
    setIsLoading(true);
    setError('');
    setAppliedCategory(categoryValue);
    setAppliedSearch(queryValue);

    try {
      const params = new URLSearchParams();
      if (categoryValue && categoryValue !== '전체') {
        params.set('category', categoryValue);
      }
      if (queryValue && queryValue.trim()) {
        params.set('query', queryValue.trim());
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/issues/search${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('이슈 목록을 불러오지 못했습니다.');
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeIssue).filter((item) => item.id) : [];
      setIssues(normalized);
    } catch (err) {
      console.error('이슈 검색 실패:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    // 첫 진입 시에는 기본 조건으로 최근 이슈 20건을 불러온다.
    fetchIssues({ categoryValue: '전체', queryValue: '' });
  }, [fetchIssues]);

  const handleApplyFilters = () => {
    fetchIssues({ categoryValue: draftCategory, queryValue: draftSearch });
  };

  const siteUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

  return (
    <section className="space-y-8">
      <MetaTags
        title="사건 프레임 아카이브 - 최근 사건 모음"
        description="서로 다른 진영의 프레임을 한눈에 비교하며 사건의 맥락을 파악하세요."
        url={siteUrl}
      />

      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm transition dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">최근 사건</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            사건별로 서로 다른 프레임을 비교합니다. 좌/우 프레임을 한 화면에서 보고 스스로 판단하세요.
          </p>
        </div>
        <aside className="inline-flex min-w-[180px] flex-col gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200">
          <span className="text-sm font-semibold">베타 서비스</span>
          <span>데이터는 일부 수동 정리 중입니다.</span>
        </aside>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">필터 &amp; 검색</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">카테고리와 키워드로 원하는 사건을 빠르게 찾아보세요.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[200px,1fr,auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            카테고리
            <select
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            검색어
            <input
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="제목 또는 요약에서 검색"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
            >
              {isLoading ? '검색 중...' : '적용'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          ※ 서버에서는 최근 50건의 사건을 조회한 뒤 카테고리/키워드 조건을 적용합니다. 추후 데이터가 많아지면 별도의 검색 인프라가 필요합니다.
        </p>
      </section>

      {isLoading && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-2">
          {issues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              조건에 맞는 사건이 없습니다. 필터를 조정해 보세요.
            </div>
          ) : (
            issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p>
          현재 적용된 조건: 카테고리 <strong>{appliedCategory}</strong>, 검색어{' '}
          <strong>{appliedSearch || '없음'}</strong>
        </p>
      </div>
    </section>
  );
}

export default HomePage;
