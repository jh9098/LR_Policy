// frontend/src/components/IssueCard.jsx
// 홈 카드: 테마 뱃지/포커스 링을 테마별로 적용 (support=violet 통일)
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getThemeLabel } from '../constants/themeConfig.js';

const BASE_CARD_CLASS = [
  'group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6',
  'hover:-translate-y-1 hover:shadow-lg',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:focus-visible:ring-offset-slate-900'
].join(' ');

// 테마별 뱃지 클래스
const THEME_PILL_CLASS = {
  policy:
    'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/50',
  stocks:
    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/50',
  parenting:
    'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/50',
  lifestyle:
    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/50',
  health:
    'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/50',
  // ✅ support 테마를 violet로 통일
  support:
    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/50'
};

// 테마별 포커스 링 (Tailwind 정적 클래스 매핑)
const THEME_RING_CLASS = {
  policy: 'focus-visible:ring-indigo-400',
  stocks: 'focus-visible:ring-amber-400',
  parenting: 'focus-visible:ring-sky-400',
  lifestyle: 'focus-visible:ring-violet-400',
  health: 'focus-visible:ring-emerald-400',
  support: 'focus-visible:ring-violet-400'
};

function IssueCard({ issue }) {
  const theme = issue.theme || 'policy';
  const themeLabel = getThemeLabel(theme);
  const themePill = THEME_PILL_CLASS[theme] || 'bg-slate-900/10 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200';
  const ringClass = THEME_RING_CLASS[theme] || 'focus-visible:ring-indigo-400';
  const summaryText = issue.easySummary || issue.summaryCard || '요약 문장이 아직 입력되지 않았습니다.';
  const href = `/issue/${issue.id}`;

  return (
    <Link to={href} className={`${BASE_CARD_CLASS} ${ringClass}`} aria-label={`${themeLabel} · ${issue.title || '제목 미상'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${themePill}`}>
            {themeLabel}
          </span>
          <span className="font-medium uppercase tracking-wide text-slate-600 dark:text-slate-200">{issue.date || '정보 부족'}</span>
        </div>

        {(issue.category || issue.subcategory) && (
          <div className="flex flex-wrap items-center gap-1">
            {issue.category ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
                {issue.category}
              </span>
            ) : null}
            {issue.subcategory ? (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/50">
                {issue.subcategory}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
        {issue.title || '제목 미상'}
      </h3>
      <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 md:line-clamp-3">
        {summaryText}
      </p>
    </Link>
  );
}

IssueCard.propTypes = {
  issue: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    date: PropTypes.string,
    theme: PropTypes.string,
    category: PropTypes.string,
    subcategory: PropTypes.string,
    summaryCard: PropTypes.string,
    easySummary: PropTypes.string
  }).isRequired
};

export default IssueCard;
