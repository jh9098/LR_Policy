// frontend/src/pages/HomePage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MetaTags from '../components/MetaTags.jsx';
import { THEME_CONFIG } from '../constants/themeConfig.js';
import { getRecentIssues, getTopIssuesByTheme, searchIssuesAcrossThemes } from '../firebaseClient.js';

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
function TitleItem({ to, title, date, theme }) {
  const themeLabel = theme ? getThemeLabel(theme) : null;
  const themeColorClass = theme ? (THEME_COLOR_CLASSES[theme] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200') : '';
  
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
        <span className="truncate text-slate-800 dark:text-slate-100">
          {title || '제목 없음'}
        </span>
      </Link>
      {date ? <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{date}</span> : null}
    </li>
  );
}

// 섹션 카드(제목 리스트 전용)
function TitleSection({ heading, items, emptyMessage, viewMoreTo, showThemePrefix = false, themeId }) {
  // 테마별 색상 클래스 (themeId가 있을 때만 적용)
  const themeColorClass = themeId ? (THEME_COLOR_CLASSES[themeId] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200') : '';
  
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          {themeId && (
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${themeColorClass}`}>
              {getThemeLabel(themeId)}
            </span>
          )}
          <span>{heading}</span>
        </h2>
        {viewMoreTo ? (
          <Link
            to={viewMoreTo}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            더 보기 →
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
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

  const [recent10, setRecent10] = useState([]);
  const [themeBuckets, setThemeBuckets] = useState(() => createEmptyBuckets());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const siteUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/` : ''), []);

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

  return (
    <section className="space-y-8">
      <MetaTags
        title="infoall - 최신 글과 테마별 톱픽"
        description="최근 등록된 글과 테마별 최신 5개를 제목 한 줄로 빠르게 확인하세요."
        url={siteUrl}
      />

      <TitleSection
        heading={q ? `검색 상위 10개 (${q})` : '최근 등록 10개'}
        items={recent10}
        emptyMessage={q ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다.'}
        viewMoreTo=""
        showThemePrefix
      />

      {loading && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          불러오는 중…
        </p>
      )}
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
