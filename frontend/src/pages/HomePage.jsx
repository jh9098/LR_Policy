// frontend/src/pages/HomePage.jsx
// infoall 랜딩 페이지. 테마별 상위 게시물 10개를 카드 형식으로 보여주고, 검색 시 테마별 결과를 즉시 갱신한다.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import IssueCard from '../components/IssueCard.jsx';
import MetaTags from '../components/MetaTags.jsx';
import { THEME_CONFIG } from '../constants/themeConfig.js';
import { getTopIssuesByTheme, searchIssuesAcrossThemes } from '../firebaseClient.js';

const ACCENT_STYLES = {
  indigo: {
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200',
    link: 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200'
  },
  rose: {
    badge: 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    link: 'text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200'
  },
  emerald: {
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    link: 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200'
  },
  sky: {
    badge: 'border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200',
    link: 'text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200'
  },
  amber: {
    badge: 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    link: 'text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200'
  },
  violet: {
    badge: 'border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200',
    link: 'text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200'
  }
};

function createEmptyBuckets() {
  return THEME_CONFIG.reduce((acc, theme) => {
    acc[theme.id] = [];
    return acc;
  }, {});
}

function HomePage() {
  const [themeBuckets, setThemeBuckets] = useState(() => createEmptyBuckets());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('top'); // 'top' | 'search'

  const siteUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/` : ''), []);

  const loadTopIssues = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        THEME_CONFIG.map(async (theme) => {
          const items = await getTopIssuesByTheme(theme.id, 10);
          return [theme.id, items];
        })
      );
      const normalized = createEmptyBuckets();
      for (const [themeId, items] of results) {
        normalized[themeId] = items;
      }
      setThemeBuckets(normalized);
      setMode('top');
    } catch (err) {
      console.error('테마별 상위 게시물 불러오기 실패:', err);
      setError('Firestore에서 데이터를 불러오지 못했습니다. 인터넷 연결과 보안 규칙을 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopIssues();
  }, [loadTopIssues]);

  const handleSearch = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const keyword = searchQuery.trim();
      if (!keyword) {
        loadTopIssues();
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const resultMap = await searchIssuesAcrossThemes(keyword, { limitPerTheme: 40 });
        const normalized = createEmptyBuckets();
        for (const theme of THEME_CONFIG) {
          normalized[theme.id] = (resultMap?.[theme.id] ?? []).slice(0, 40);
        }
        setThemeBuckets(normalized);
        setMode('search');
      } catch (err) {
        console.error('테마별 검색 실패:', err);
        setError('검색 중 문제가 발생했습니다. Firestore 권한 또는 네트워크 상태를 확인해 주세요.');
      } finally {
        setIsLoading(false);
      }
    },
    [loadTopIssues, searchQuery]
  );

  const handleResetSearch = useCallback(() => {
    setSearchQuery('');
    loadTopIssues();
  }, [loadTopIssues]);

  const isSearchMode = mode === 'search';

  return (
    <section className="space-y-10">
      <MetaTags
        title="infoall - 테마별 맞춤 정보"
        description="사건/정책, 육아, 생활, 건강 등 다양한 테마의 최신 정보를 한눈에 살펴보세요."
        url={siteUrl}
      />

      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 px-6 py-10 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/60">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 text-center">
          <div className="space-y-3">
            <span className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
              infoall
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              지금 필요한 모든 정보를 한 곳에서
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              테마를 선택하면 가장 많이 찾는 정보부터 최신 콘텐츠까지 빠르게 확인할 수 있습니다. 기본 뷰는 테마별 상위 10개 게시물을 보여주며, 검색을 사용하면 테마에 맞는 맞춤 결과를 확인할 수 있습니다.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center" onSubmit={handleSearch}>
            <label className="relative w-full max-w-xl text-left">
              <span className="sr-only">검색어 입력</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="키워드로 전체 테마 검색"
                className="w-full rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              >
                검색
              </button>
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              >
                초기화
              </button>
            </div>
          </form>

        </div>
      </header>

      {isLoading && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          테마별 콘텐츠를 불러오는 중입니다...
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      {THEME_CONFIG.map((theme) => {
        const accent = ACCENT_STYLES[theme.accent] ?? ACCENT_STYLES.indigo;
        const items = themeBuckets[theme.id] ?? [];
        const displayItems = isSearchMode ? items.slice(0, 20) : items.slice(0, 10);
        const emptyMessage = isSearchMode
          ? '검색 결과가 없습니다. 다른 키워드를 시도해 보세요.'
          : '아직 등록된 게시물이 없습니다. 관리자에서 새 콘텐츠를 추가해 주세요.';

        return (
          <section
            key={theme.id}
            className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${accent.badge}`}
                >
                  {theme.label}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{theme.label} 톱픽</h2>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{theme.description}</p>
                {isSearchMode ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    "{searchQuery.trim()}" 검색 결과 상위 {displayItems.length}건을 보여주는 중입니다.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">최근 등록된 상위 10개 게시물을 기준으로 정렬했습니다.</p>
                )}
              </div>
              <Link
                to={`/theme/${theme.id}`}
                className={`inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold ${accent.link}`}
              >
                더 많은 {theme.label} 보기 →
              </Link>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {displayItems.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  {emptyMessage}
                </div>
              ) : (
                displayItems.map((issue) => <IssueCard key={issue.id} issue={issue} />)
              )}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export default HomePage;
