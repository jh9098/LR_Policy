// frontend/src/components/SectionCard.jsx
// 공통 카드 UI: tone + 시맨틱 태그(as) + id(anchor) + actions 슬롯 + className 확장
import PropTypes from 'prop-types';

const toneClassMap = {
  neutral:
    'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
  progressive:
    'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100',
  conservative:
    'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100',
  impact:
    'border-indigo-200 bg-indigo-50/80 text-slate-900 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-100'
};

function SectionCard({ as: As, id, title, badgeText, tone, actions, className, children }) {
  const toneClasses = toneClassMap[tone] ?? toneClassMap.neutral;

  return (
    <As id={id} className={`flex flex-col gap-4 rounded-2xl border p-6 shadow-sm transition ${toneClasses} ${className || ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold leading-tight">{title}</h2>
            {badgeText ? (
              <span className="inline-flex items-center rounded-full border border-current px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                {badgeText}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </As>
  );
}

SectionCard.propTypes = {
  as: PropTypes.elementType,
  id: PropTypes.string,
  title: PropTypes.string.isRequired,
  badgeText: PropTypes.string,
  tone: PropTypes.oneOf(['neutral', 'progressive', 'conservative', 'impact']),
  actions: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node
};

SectionCard.defaultProps = {
  as: 'section',
  id: undefined,
  badgeText: '',
  tone: 'neutral',
  actions: null,
  className: '',
  children: null
};

export default SectionCard;
