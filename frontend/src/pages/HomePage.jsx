// frontend/src/pages/HomePage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MetaTags from '../components/MetaTags.jsx';
import { DEFAULT_THEME_ID, THEME_CONFIG, THEME_ID_SET } from '../constants/themeConfig.js';
import {
  getRecentIssues,
  getTopIssuesByTheme,
  searchIssuesAcrossThemes,
  getTrendingIssues,
  getUserScraps
} from '../firebaseClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function createEmptyBuckets() {
  return THEME_CONFIG.reduce((acc, theme) => {
    acc[theme.id] = [];
    return acc;
  }, {});
}

function getThemeLabel(themeId) {
  const t = THEME_CONFIG.find((x) => x.id === themeId);
  return t?.label ?? themeId ?? '기타';
}

// 테마별 색상 클래스 매핑 (일관 팔레트)
const THEME_COLOR_CLASSES = {
  policy: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  stocks: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  parenting: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  lifestyle: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
  health: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  support: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
};

// 제목 한 줄 리스트 아이템
function TitleItem({ to, title, date, theme, commentCount = 0 }) {
  const themeLabel = theme ? getThemeLabel(theme) : null;
  const themeColorClass = theme ? (THEME_COLOR_CLASSES[theme] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200') : '';
  const normalizedCommentCount = Number.isFinite(Number(commentCount)) ? Math.max(Number(commentCount), 0) : 0;

  return (
    <li className="flex items-center justify-between gap-3">
      <Link
        to={to}
        className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:text-indigo-600 dark:hover:text-indigo-200"
        title={themeLabel ? `${themeLabel} | ${title || '제목 없음'}` : (title || '제목 없음')}
      >
        {themeLabel && (
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${themeColorClass}`}>
            {themeLabel}
          </span>
        )}
        <span className="truncate text-slate-800 dark:text-slate-100">{title || '제목 없음'}</span>
        <span className="ml-2 shrink-0 text-[11px] font-bold text-rose-600 dark:text-rose-300">[{normalizedCommentCount}]</span>
      </Link>
      {date ? <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{date}</span> : null}
    </li>
  );
}

// 섹션 카드(제목 리스트 전용)
function TitleSection({
  heading,
  items,
  emptyMessage,
  viewMoreTo,
  showThemePrefix = false,
  themeId,
  description = '',
  loading = false
}) {
  // 테마별 색상 클래스 (themeId가 있을 때만 적용)
  const themeColorClass = themeId ? (THEME_COLOR_CLASSES[themeId] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200') : '';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            {themeId && (
              <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${themeColorClass}`}>
                {getThemeLabel(themeId)}
              </span>
            )}
            <span>{heading}</span>
          </h2>
          {description ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {viewMoreTo ? (
          <Link
            to={viewMoreTo}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            더 보기 →
          </Link>
        ) : null}
      </div>
      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <TitleItem
              key={it.id}
              to={`/issue/${it.id}`}
              title={it.title}
              date={it.date}
              theme={showThemePrefix ? it.theme : undefined}
              commentCount={it.stats?.commentCount ?? 0}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function HomePage() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const { user } = useAuth();

  const [recent10, setRecent10] = useState([]);
  const [themeBuckets, setThemeBuckets] = useState(() => createEmptyBuckets());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingSettings, setTrendingSettings] = useState({ minUpvotes: 5, withinHours: 24, maxItems: 10 });
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState('');
  const [scrapItems, setScrapItems] = useState([]);
  const [scrapLoading, setScrapLoading] = useState(false);
  const [scrapError, setScrapError] = useState('');
  const [isScrapOpen, setScrapOpen] = useState(false);

  const siteUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/` : ''), []);
  const displayName = useMemo(() => {
    if (!user) {
      return '';
    }
    return user.displayName?.trim() || user.email || '로그인 사용자';
  }, [user]);

  const scrapBuckets = useMemo(() => {
    const buckets = createEmptyBuckets();
    for (const entry of scrapItems) {
      const issue = entry?.issue;
      if (!issue) continue;
      const themeId = THEME_ID_SET.has(issue.theme) ? issue.theme : DEFAULT_THEME_ID;
      buckets[themeId] = buckets[themeId] ?? [];
      buckets[themeId].push(issue);
    }
    return buckets;
  }, [scrapItems]);

  const scrapSections = useMemo(
    () => THEME_CONFIG.filter((theme) => (scrapBuckets[theme.id] ?? []).length > 0),
    [scrapBuckets]
  );

  const trendingDescription = useMemo(() => {
    const { minUpvotes, withinHours } = trendingSettings;
    const parts = [];
    parts.push(minUpvotes > 0 ? `추천 ${minUpvotes}회 이상` : '추천 수 제한 없음');
    parts.push(withinHours > 0 ? `최근 ${withinHours}시간` : '기간 제한 없음');
    return parts.join(' · ');
  }, [trendingSettings]);

  const trendingEmptyMessage = trendingError || '조건을 만족하는 게시물이 없습니다.';

  const loadTop = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recent, perTheme] = await Promise.all([
        getRecentIssues(10),
        Promise.all(
          THEME_CONFIG.map(async (t) => {
            const list = await getTopIssuesByTheme(t.id, 5);
            return [t.id, list];
          })
        )
      ]);
      const buckets = createEmptyBuckets();
      for (const [id, list] of perTheme) buckets[id] = list;
      setRecent10(recent);
      setThemeBuckets(buckets);
    } catch (e) {
      console.error(e);
      setError('Firestore에서 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError('');
    try {
      const { items, settings } = await getTrendingIssues();
      setTrendingItems(items);
      setTrendingSettings(settings);
    } catch (e) {
      console.error(e);
      setTrendingItems([]);
      setTrendingError('실시간 인기 게시물을 불러오지 못했습니다.');
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const loadScraps = useCallback(
    async (uid) => {
      if (!uid) return;
      setScrapLoading(true);
      setScrapError('');
      try {
        const list = await getUserScraps(uid, { limitCount: 80 });
        setScrapItems(list);
      } catch (e) {
        console.error(e);
        setScrapItems([]);
        setScrapError('스크랩을 불러오지 못했습니다.');
      } finally {
        setScrapLoading(false);
      }
    },
    []
  );

  const loadSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const map = await searchIssuesAcrossThemes(q, { limitPerTheme: 40, sort: 'recent' });
      const buckets = createEmptyBuckets();
      for (const t of THEME_CONFIG) {
        buckets[t.id] = (map?.[t.id] ?? []).slice(0, 5);
      }
      const merged = Object.values(map ?? {}).flat();
      const top10 = merged
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 10);
      setRecent10(top10);
      setThemeBuckets(buckets);
    } catch (e) {
      console.error(e);
      setError('검색 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (q) loadSearch();
    else loadTop();
  }, [q, loadSearch, loadTop]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    if (!user) {
      setScrapItems([]);
      setScrapError('');
      setScrapOpen(false);
      return;
    }
    loadScraps(user.uid);
  }, [user, loadScraps]);

  const handleToggleScrap = () => {
    if (!user) {
      return;
    }
    if (!isScrapOpen) {
      loadScraps(user.uid);
    }
    setScrapOpen((prev) => !prev);
  };

  return (
    <section className="space-y-8">
      <MetaTags
        title="infoall - 최신 글과 테마별 톱픽"
        description="최근 등록된 글과 테마별 최신 5개를 제목 한 줄로 빠르게 확인하세요."
        url={siteUrl}
      />

      {user ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">로그인 계정</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
              {user.email ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleToggleScrap}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-indigo-500/80 dark:focus-visible:ring-offset-slate-900"
            >
              {isScrapOpen ? '내 스크랩 닫기' : '내 스크랩 보기'}
            </button>
          </div>
          {isScrapOpen ? (
            <div className="mt-4 space-y-4">
              {scrapLoading ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                  내 스크랩을 불러오는 중…
                </p>
              ) : scrapError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
                  {scrapError}
                </p>
              ) : scrapSections.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  아직 스크랩한 게시물이 없습니다. 관심 있는 게시물에서 스크랩 버튼을 눌러 저장해보세요.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {scrapSections.map((theme) => (
                    <div
                      key={theme.id}
                      className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-indigo-200 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-indigo-400/60"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{theme.label}</h3>
                        <Link
                          to={`/theme/${theme.id}`}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          테마 이동
                        </Link>
                      </div>
                      <ul className="space-y-2">
                        {(scrapBuckets[theme.id] ?? []).map((issue) => (
                          <TitleItem
                            key={issue.id}
                            to={`/issue/${issue.id}`}
                            title={issue.title}
                            date={issue.date}
                            theme={theme.id}
                            commentCount={issue.stats?.commentCount ?? 0}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <TitleSection
        heading="실시간 인기 게시물 10개"
        description={trendingDescription}
        items={trendingItems}
        emptyMessage={trendingEmptyMessage}
        viewMoreTo={null}
        showThemePrefix
        loading={trendingLoading}
      />

      {trendingError && !trendingLoading ? (
        <p className="text-xs text-rose-600 dark:text-rose-300">{trendingError}</p>
      ) : null}

      <TitleSection
        heading={q ? `검색 상위 10개 (${q})` : '최근 등록 10개'}
        description={
          q
            ? '검색 결과에서 날짜 순으로 상위 10개를 보여줍니다.'
            : '가장 최근에 등록된 게시물을 한눈에 확인하세요.'
        }
        items={recent10}
        emptyMessage={q ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다.'}
        viewMoreTo=""
        showThemePrefix
        loading={loading}
      />

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {THEME_CONFIG.map((t) => (
          <TitleSection
            key={t.id}
            heading={`${t.label} 최근 5개`}
            items={(themeBuckets[t.id] ?? []).slice(0, 5)}
            emptyMessage="아직 항목이 없습니다."
            viewMoreTo={`/theme/${t.id}`}
            themeId={t.id}
          />
        ))}
      </div>
    </section>
  );
}

export default HomePage;
