// frontend/src/components/IssueCard.jsx
// 홈 카드에서 Firestore 데이터를 바로 렌더링한다. easySummary가 있으면 우선 표시하고, 없으면 summaryCard를 사용한다.

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const cardClassName = [
  'group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6',
  'hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-400/60 dark:focus-visible:ring-offset-slate-900',
].join(' ');

function IssueCard({ issue }) {
  const summaryText = issue.easySummary?.trim() ? issue.easySummary : issue.summaryCard;

  return (
    <Link to={`/issue/${issue.id}`} className={cardClassName}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
        <span className="font-medium uppercase tracking-wide text-slate-600 dark:text-slate-200">{issue.date || '정보 부족'}</span>
        {issue.category ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
            {issue.category}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
        {issue.title || '제목 없음'}
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
    category: PropTypes.string,
    summaryCard: PropTypes.string,
    easySummary: PropTypes.string,
  }).isRequired,
};

export default IssueCard;
