// frontend/src/components/issue/HealthGuideView.jsx
// 공개 이슈 페이지에서 건강 테마 전용 가이드를 렌더링한다.

import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';

function normalizeList(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

function HealthGuideView({ guide }) {
  if (!guide) {
    return null;
  }

  const lifestyleTips = normalizeList(guide.lifestyleTips);
  const emergencyGuide = normalizeList(guide.emergencyGuide);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="건강 테마 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {lifestyleTips.length > 0 ? (
        <SectionCard title="생활 습관 팁" tone="neutral" badgeText="생활">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {lifestyleTips.map((tip, index) => (
              <li key={`health-tip-${index}`}>{tip}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.conditions)
        ? guide.conditions
            .filter((condition) => {
              const summary = typeof condition?.summary === 'string' ? condition.summary.trim() : '';
              const hasDetails =
                normalizeList(condition?.warningSigns).length > 0 ||
                normalizeList(condition?.careTips).length > 0 ||
                normalizeList(condition?.resources).length > 0;
              return (
                (typeof condition?.name === 'string' && condition.name.trim().length > 0) ||
                summary.length > 0 ||
                hasDetails
              );
            })
            .map((condition, index) => {
              const warning = normalizeList(condition?.warningSigns);
              const care = normalizeList(condition?.careTips);
              const resources = normalizeList(condition?.resources);
              return (
                <SectionCard
                  key={`health-condition-${index}`}
                  title={condition?.name || `건강 주제 ${index + 1}`}
                  tone="neutral"
                  badgeText="건강"
                >
                  {condition?.summary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{condition.summary}</p>
                  ) : null}
                  {warning.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">경고 신호</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {warning.map((item, itemIndex) => (
                          <li key={`health-warning-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {care.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">관리/돌봄 팁</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {care.map((item, itemIndex) => (
                          <li key={`health-care-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {resources.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">추천 자료</p>
                      <ul className="space-y-1 text-xs leading-relaxed text-slate-600 underline-offset-2 dark:text-slate-300">
                        {resources.map((item, itemIndex) => (
                          <li key={`health-resource-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })
        : null}

      {emergencyGuide.length > 0 ? (
        <SectionCard title="긴급 대응 가이드" tone="impact" badgeText="긴급">
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {emergencyGuide.map((item, index) => (
              <li key={`health-emergency-${index}`}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

HealthGuideView.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    conditions: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        summary: PropTypes.string,
        warningSigns: PropTypes.arrayOf(PropTypes.string),
        careTips: PropTypes.arrayOf(PropTypes.string),
        resources: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    lifestyleTips: PropTypes.arrayOf(PropTypes.string),
    emergencyGuide: PropTypes.arrayOf(PropTypes.string)
  })
};

HealthGuideView.defaultProps = {
  guide: null
};

export default HealthGuideView;
