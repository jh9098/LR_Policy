// frontend/src/pages/HomePage.jsx
// 홈 화면은 Firestore Web SDK로 직접 데이터를 읽어온다. Render 백엔드는 더 이상 호출하지 않는다.
// TODO: 데이터가 많아지면 서버 사이드 검색/인덱싱 혹은 Cloud Functions를 검토해야 한다.

import { useCallback, useEffect, useMemo, useState } from 'react';
import IssueCard from '../components/IssueCard.jsx';
import MediaLandscapeSection from '../components/MediaLandscapeSection.jsx';
import MetaTags from '../components/MetaTags.jsx';
import { CATEGORY_FILTER_OPTIONS, getSubcategoryOptions } from '../constants/categoryStructure.js';
import { getRecentIssues, searchIssuesClient } from '../firebaseClient.js';

function HomePage() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [categoryDraft, setCategoryDraft] = useState('전체');
  const [subcategoryDraft, setSubcategoryDraft] = useState('전체');
  const [queryDraft, setQueryDraft] = useState('');
  const [activeFilters, setActiveFilters] = useState({ category: '전체', subcategory: '전체', query: '' });

  const effectiveCategory = categoryDraft === '전체' ? null : categoryDraft;
  const subcategoryOptions = useMemo(
    () => (effectiveCategory ? getSubcategoryOptions(effectiveCategory) : []),
    [effectiveCategory]
  );

  useEffect(() => {
    if (categoryDraft === '전체') {
      if (subcategoryDraft !== '전체') {
        setSubcategoryDraft('전체');
      }
      return;
    }
    if (!subcategoryOptions.includes(subcategoryDraft)) {
      setSubcategoryDraft('전체');
    }
  }, [categoryDraft, subcategoryDraft, subcategoryOptions]);

  const fetchRecentIssues = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await getRecentIssues(50);
      setIssues(list);
      setActiveFilters({ category: '전체', subcategory: '전체', query: '' });
      setSubcategoryDraft('전체');
    } catch (err) {
      console.error('Firestore에서 최근 이슈 불러오기 실패:', err);
      setError('최근 정책/사건 목록을 불러오지 못했습니다. 인터넷 연결 또는 Firestore 설정을 확인하세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentIssues();
  }, [fetchRecentIssues]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Firestore에서 최근 문서를 가져온 뒤 클라이언트에서 조건 필터링한다.
      const baseList = await searchIssuesClient(queryDraft, 80);
      const filtered = baseList.filter((issue) => {
        const matchesCategory = categoryDraft === '전체' || issue.category === categoryDraft;
        const matchesSubcategory =
          categoryDraft === '전체' ||
          subcategoryDraft === '전체' ||
          issue.subcategory === subcategoryDraft;
        return matchesCategory && matchesSubcategory;
      });
      setIssues(filtered);
      setActiveFilters({
        category: categoryDraft,
        subcategory: categoryDraft === '전체' ? '전체' : subcategoryDraft,
        query: queryDraft.trim()
      });
    } catch (err) {
      console.error('Firestore 검색 실패:', err);
      setError('검색 중 문제가 발생했습니다. Firestore 권한 또는 네트워크를 확인하세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const siteUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/` : ''), []);

  return (
    <section className="space-y-8">
      <MetaTags
        title="사건 프레임 아카이브 - 최근 정책/사건"
        description="핵심 맥락을 먼저 이해하고, 필요할 때 주요 쟁점과 시각을 살펴보세요. 모든 데이터는 Firestore에서 바로 불러옵니다."
        url={siteUrl}
      />

      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">최근 정책/사건</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          이 페이지는 Firestore Web SDK를 통해 직접 데이터를 불러온다. Render 백엔드를 거치지 않으므로 배포 환경에서도 동일한 크롬
          브라우저 요청만으로 최신 데이터를 확인할 수 있다.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">필터 · 검색</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          Firestore에서 최근 문서를 불러온 뒤 브라우저 메모리에서 필터링한다. 검색어 입력 후 검색 버튼을 누르면 즉시 반영된다.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-[180px,200px,1fr,auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            카테고리
            <select
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            하위 카테고리
            <select
              value={subcategoryDraft}
              onChange={(event) => setSubcategoryDraft(event.target.value)}
              disabled={categoryDraft === '전체'}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
            >
              <option value="전체">전체</option>
              {subcategoryOptions.map((option) => (
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

          <div className="flex items-end sm:justify-end">
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
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          ※ DEV 단계에서는 Firestore Security Rules를 완전히 열어두었기 때문에 누구나 데이터에 접근 가능하다. TODO: 프로덕션에서
          는 인증·권한을 반드시 설정해야 한다.
        </p>
      </section>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
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
          적용된 조건 · 카테고리: <strong>{activeFilters.category}</strong>, 하위 카테고리:{' '}
          <strong>{activeFilters.subcategory}</strong>, 검색어: <strong>{activeFilters.query || '없음'}</strong>
        </p>
        <button
          type="button"
          onClick={fetchRecentIssues}
          className="mt-2 inline-flex items-center text-xs font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
        >
          Firestore에서 최근 50건 다시 불러오기
        </button>
      </div>

      <MediaLandscapeSection />
    </section>
  );
}

export default HomePage;
