// frontend/src/components/IssueCard.jsx
// 홈 화면에서 사용하는 카드. easySummary가 있으면 우선 노출하고, 없으면 summaryCard를 보여준다.

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getThemeLabel } from '../constants/themeConfig.js';

const cardClassName = [
  'group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6',
  'hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-400/60 dark:focus-visible:ring-offset-slate-900'
].join(' ');

function IssueCard({ issue }) {
  const summaryText = issue.easySummary || issue.summaryCard || '요약 문장이 아직 입력되지 않았습니다.';
  const themeLabel = getThemeLabel(issue.theme);

  return (
    <Link to={`/issue/${issue.id}`} className={cardClassName}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-900/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-100/10 dark:text-slate-200">
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
      <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 md:line-clamp-3">{summaryText}</p>
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
