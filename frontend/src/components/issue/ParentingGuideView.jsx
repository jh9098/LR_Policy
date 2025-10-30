// frontend/src/components/issue/ParentingGuideView.jsx
// 공개 이슈 페이지에서 육아 테마 전용 가이드를 렌더링한다.

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

function ParentingGuideView({ guide }) {
  if (!guide) {
    return null;
  }

  const generalTips = normalizeList(guide.generalTips);
  const emergencyContacts = normalizeList(guide.emergencyContacts);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="육아 테마 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {generalTips.length > 0 ? (
        <SectionCard title="전체 공통 팁" tone="neutral" badgeText="TIP">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {generalTips.map((tip, index) => (
              <li key={`parenting-general-${index}`}>{tip}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.ageGroups)
        ? guide.ageGroups
            .filter((group) => {
              const summary = typeof group?.focusSummary === 'string' ? group.focusSummary.trim() : '';
              const hasDetails =
                normalizeList(group?.developmentFocus).length > 0 ||
                normalizeList(group?.careTips).length > 0 ||
                normalizeList(group?.resources).length > 0;
              return summary.length > 0 || hasDetails || (typeof group?.ageRange === 'string' && group.ageRange.trim().length > 0);
            })
            .map((group, index) => {
              const development = normalizeList(group?.developmentFocus);
              const careTips = normalizeList(group?.careTips);
              const resources = normalizeList(group?.resources);
              return (
                <SectionCard
                  key={`parenting-age-${index}`}
                  title={group?.ageRange || `연령대 ${index + 1}`}
                  tone="neutral"
                  badgeText="육아"
                >
                  {group?.focusSummary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{group.focusSummary}</p>
                  ) : null}
                  {development.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">발달 포인트</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {development.map((item, itemIndex) => (
                          <li key={`parenting-development-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {careTips.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">돌봄 팁</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {careTips.map((item, itemIndex) => (
                          <li key={`parenting-care-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {resources.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">추천 자료</p>
                      <ul className="space-y-1 text-xs leading-relaxed text-slate-600 underline-offset-2 dark:text-slate-300">
                        {resources.map((item, itemIndex) => (
                          <li key={`parenting-resource-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })
        : null}

      {emergencyContacts.length > 0 ? (
        <SectionCard title="긴급/상담 연락처" tone="impact" badgeText="긴급">
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {emergencyContacts.map((contact, index) => (
              <li key={`parenting-emergency-${index}`}>{contact}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

ParentingGuideView.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    ageGroups: PropTypes.arrayOf(
      PropTypes.shape({
        ageRange: PropTypes.string,
        focusSummary: PropTypes.string,
        developmentFocus: PropTypes.arrayOf(PropTypes.string),
        careTips: PropTypes.arrayOf(PropTypes.string),
        resources: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    generalTips: PropTypes.arrayOf(PropTypes.string),
    emergencyContacts: PropTypes.arrayOf(PropTypes.string)
  })
};

ParentingGuideView.defaultProps = {
  guide: null
};

export default ParentingGuideView;
