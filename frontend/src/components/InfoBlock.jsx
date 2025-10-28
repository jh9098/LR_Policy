// frontend/src/components/InfoBlock.jsx
import PropTypes from 'prop-types';

const BADGE_STYLES = {
  fact: {
    label: '확실한 사실',
    className:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/50'
  },
  left: {
    label: '진보 프레임 (확실하지 않은 사실)',
    className:
      'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/50'
  },
  right: {
    label: '보수 프레임 (확실하지 않은 사실)',
    className:
      'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/50'
  },
  impact: {
    label: '이게 내 삶에 뭐가 변함? (ChatGPT의 의견)',
    className:
      'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-400/50'
  }
};

function renderBody(body) {
  if (!body) {
    return null;
  }

  // 배열 형태면 불릿 리스트로 표현한다.
  if (Array.isArray(body)) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {body.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  if (typeof body === 'object') {
    const { text, points } = body;
    return (
      <div className="space-y-3">
        {text && (
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {text}
          </p>
        )}
        {Array.isArray(points) && points.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {points.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // 문자열 또는 JSX 노드면 그대로 출력한다.
  return (
    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
      {body}
    </p>
  );
}

function InfoBlock({ title, badgeType, headline, body, note, children }) {
  const badge = BADGE_STYLES[badgeType] ?? BADGE_STYLES.fact;

  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <span
        className={`absolute left-6 top-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
      <div className="mt-12 space-y-4">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {headline && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{headline}</p>}
        </header>
        {renderBody(body)}
        {children}
        {note && <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      </div>
    </section>
  );
}

InfoBlock.propTypes = {
  title: PropTypes.string.isRequired,
  badgeType: PropTypes.oneOf(['fact', 'left', 'right', 'impact']).isRequired,
  headline: PropTypes.string,
  body: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.shape({
      text: PropTypes.string,
      points: PropTypes.arrayOf(PropTypes.string)
    })
  ]),
  note: PropTypes.string,
  children: PropTypes.node
};

InfoBlock.defaultProps = {
  headline: '',
  body: null,
  note: '',
  children: null
};

export default InfoBlock;
