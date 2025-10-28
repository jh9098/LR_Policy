// frontend/src/components/IssueCard.jsx
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const cardClassName = [
  'block rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
  'transition hover:-translate-y-1 hover:shadow-md'
].join(' ');

function IssueCard({ issue }) {
  return (
    <Link to={`/issue/${issue.id}`} className={cardClassName}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issue.date}</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">{issue.title}</h3>
      <p className="mt-3 text-sm text-slate-600">{issue.summary}</p>
    </Link>
  );
}

IssueCard.propTypes = {
  issue: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired
  }).isRequired
};

export default IssueCard;
