// frontend/src/pages/ThemePage.jsx
// 특정 테마에 속한 게시물을 정렬/검색/필터링해 보여주는 페이지.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import IssueCard from '../components/IssueCard.jsx';
import MetaTags from '../components/MetaTags.jsx';
import {
  getCategoryFilterOptions,
  getCategoryOptions,
  getSubcategoryOptions
} from '../constants/categoryStructure.js';
import { DEFAULT_THEME_ID, getThemeById } from '../constants/themeConfig.js';
import { getIssuesByTheme, searchIssuesByTheme } from '../firebaseClient.js';

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순 (date desc)' },
  { value: 'popular', label: '조회순 (views desc)' },
  { value: 'title', label: '제목순 (가나다)' }
];

function ThemePage() {
  const params = useParams();
  const requestedThemeId = params.themeId ?? DEFAULT_THEME_ID;
  const theme = getThemeById(requestedThemeId);
  const isUnknownTheme = requestedThemeId !== theme.id;

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [subcategoryFilter, setSubcategoryFilter] = useState('전체');

  const categoryOptions = useMemo(() => getCategoryOptions(theme.id), [theme.id]);
  const categoryFilterOptions = useMemo(() => getCategoryFilterOptions(theme.id), [theme.id]);
  const hasCategoryFilter = categoryOptions.length > 0;

  const subcategoryOptions = useMemo(() => {
    if (!hasCategoryFilter || categoryFilter === '전체') return [];
    return getSubcategoryOptions(theme.id, categoryFilter);
  }, [categoryFilter, hasCategoryFilter, theme.id]);

  // 필터 UI 상태 정합성 유지
  useEffect(() => {
    if (!hasCategoryFilter) {
      if (categoryFilter !== '전체') setCategoryFilter('전체');
      if (subcategoryFilter !== '전체') setSubcategoryFilter('전체');
      return;
    }
    if (categoryFilter === '전체') {
      if (subcategoryFilter !== '전체') setSubcategoryFilter('전체');
      return;
    }
    if (!categoryOptions.includes(categoryFilter)) {
      setCategoryFilter('전체');
      return;
    }
    if (subcategoryFilter !== '전체' && !subcategoryOptions.includes(subcategoryFilter)) {
      setSubcategoryFilter('전체');
    }
  }, [categoryFilter, categoryOptions, hasCategoryFilter, subcategoryFilter, subcategoryOptions]);

  const loadIssues = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await getIssuesByTheme(theme.id, { sort: sortOption, limitCount: 100 });
      setItems(list);
      setIsSearchMode(false);
    } catch (err) {
      console.error('테마별 게시물 불러오기 실패:', err);
      setError('Firestore에서 데이터를 불러오지 못했습니다. 연결 상태와 Rules 설정을 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [sortOption, theme.id]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleSearch = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const keyword = searchKeyword.trim();
      if (!keyword) {
        loadIssues();
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const list = await searchIssuesByTheme(theme.id, keyword, { limitCount: 120, sort: sortOption });
        setItems(list);
        setIsSearchMode(true);
      } catch (err) {
        console.error('테마 검색 실패:', err);
        setError('검색 중 문제가 발생했습니다. Firestore 권한 혹은 네트워크를 확인해 주세요.');
      } finally {
        setIsLoading(false);
      }
    },
    [loadIssues, searchKeyword, sortOption, theme.id]
  );

  const handleReset = useCallback(() => {
    setSearchKeyword('');
    setCategoryFilter('전체');
    setSubcategoryFilter('전체');
    setSortOption('recent');
    loadIssues();
  }, [loadIssues]);

  // 🔧 버그 수정: 카테고리·서브카테고리 매칭 로직을 명시적으로 분리
  const filteredItems = useMemo(() => {
    if (!hasCategoryFilter) return items;

    return items.filter((item) => {
      const categoryOk = categoryFilter === '전체' || item.category === categoryFilter;
      if (!categoryOk) return false;

      const subcategoryOk =
        subcategoryFilter === '전체' || item.subcategory === subcategoryFilter;

      return subcategoryOk;
    });
  }, [categoryFilter, hasCategoryFilter, items, subcategoryFilter]);

  const siteUrl = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/theme/${theme.id}` : ''),
    [theme.id]
  );

  return (
    <section className="space-y-8">
      <MetaTags
        title={`infoall - ${theme.label}`}
        description={`${theme.label} 테마의 최신 콘텐츠를 확인하세요.`}
        url={siteUrl}
      />

      <header className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Theme · {theme.label}</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{theme.label} 전체 보기</h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{theme.description}</p>
            {isUnknownTheme && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                요청한 테마 "{requestedThemeId}"를 찾을 수 없어 기본 테마로 이동했습니다.
              </p>
            )}
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
          >
            홈으로 돌아가기 →
          </Link>
        </div>

        <form
          className="mt-6 grid gap-4 md:grid-cols-[minmax(240px,1fr),minmax(160px,200px),minmax(160px,200px),auto]"
          onSubmit={handleSearch}
        >
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">검색어</span>
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={`${theme.label} 키워드 검색`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">정렬 기준</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {hasCategoryFilter ? (
            <>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">카테고리</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {categoryFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">세부 카테고리</span>
                <select
                  value={subcategoryFilter}
                  onChange={(event) => setSubcategoryFilter(event.target.value)}
                  disabled={categoryFilter === '전체'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="전체">전체</option>
                  {subcategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              검색
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="ml-2 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              초기화
            </button>
          </div>
        </form>
      </header>

      {error ? (
        <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(isLoading ? Array.from({ length: 6 }) : filteredItems).map((item, idx) =>
          isLoading ? (
            <div key={idx} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/40" />
          ) : (
            <IssueCard key={item.id} issue={item} />
          )
        )}
      </div>

      {!isLoading && !error && filteredItems.length === 0 ? (
        <p className="text-center text-sm text-slate-500">조건에 맞는 게시글이 없습니다.</p>
      ) : null}
    </section>
  );
}

export default ThemePage;
