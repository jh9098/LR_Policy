// frontend/src/pages/HomePage.jsx
import { useCallback, useEffect, useState } from 'react';
import IssueCard from '../components/IssueCard.jsx';
import MediaLandscapeSection from '../components/MediaLandscapeSection.jsx';
import MetaTags from '../components/MetaTags.jsx';
import { API_BASE_URL } from '../config.js';

const CATEGORY_OPTIONS = ['전체', '부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];

function normalizeIssue(raw) {
  return {
    id: raw.id ?? '',
    title: raw.title ?? '',
    date: raw.date ?? '',
    category: raw.category ?? '기타',
    summaryCard: raw.summaryCard ?? ''
  };
}

function HomePage() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [categoryDraft, setCategoryDraft] = useState('전체');
  const [queryDraft, setQueryDraft] = useState('');
  const [activeFilters, setActiveFilters] = useState({ category: '전체', query: '' });

  const loadRecentIssues = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/issues`);
      if (!response.ok) {
        throw new Error('최근 정책/사건 목록을 불러오지 못했습니다.');
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeIssue).filter((item) => item.id) : [];
      setIssues(normalized);
      setActiveFilters({ category: '전체', query: '' });
    } catch (err) {
      console.error('최근 이슈 불러오기 실패:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentIssues();
  }, [loadRecentIssues]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (categoryDraft && categoryDraft !== '전체') {
        params.set('category', categoryDraft);
      }
      if (queryDraft.trim()) {
        params.set('query', queryDraft.trim());
      }

      const queryString = params.toString();
      const response = await fetch(`${API_BASE_URL}/issues/search${queryString ? `?${queryString}` : ''}`);
      if (!response.ok) {
        throw new Error('검색 결과를 불러오지 못했습니다.');
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeIssue).filter((item) => item.id) : [];
      setIssues(normalized);
      setActiveFilters({ category: categoryDraft, query: queryDraft.trim() });
    } catch (err) {
      console.error('검색 실패:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const siteUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

  return (
    <section className="space-y-8">
      <MetaTags
        title="사건 프레임 아카이브 - 최근 정책/사건"
        description="핵심 맥락을 먼저 이해한 뒤, 필요할 때 주요 쟁점과 시각 차이를 살펴보세요."
        url={siteUrl}
      />

      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">최근 정책/사건</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          핵심 내용을 먼저 이해하고, 마지막에 쟁점과 시각 차이를 확인하세요. 이 서비스는 사실과 맥락을 기반으로 정보를 정리한 후,
          선택적으로 진영별 주장을 덧붙입니다.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">필터 · 검색</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          카테고리와 키워드로 궁금한 정책/사건을 찾아보세요. 검색 버튼을 누르면 서버에서 조건에 맞춰 다시 불러옵니다.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[180px,1fr,auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            카테고리
            <select
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
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
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="제목 또는 요약 문장 검색"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
            >
              {isLoading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          ※ 현재는 Firestore에서 최대 50건을 불러온 뒤 메모리에서 필터링합니다. 데이터가 많아지면 별도의 검색 인덱스 도입이 필요합니다.
        </p>
      </section>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-2">
          {issues.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              조건에 맞는 정책/사건이 없습니다. 검색 조건을 조정하거나 최근 목록을 다시 불러오세요.
            </div>
          ) : (
            issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p>
          적용된 조건 · 카테고리: <strong>{activeFilters.category}</strong>, 검색어: <strong>{activeFilters.query || '없음'}</strong>
        </p>
        <button
          type="button"
          onClick={loadRecentIssues}
          className="mt-2 inline-flex items-center text-xs font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
        >
          최근 20건 다시 보기
        </button>
      </div>

      <MediaLandscapeSection />
    </section>
  );
}

export default HomePage;
