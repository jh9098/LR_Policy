// frontend/src/components/admin/ParentingThemePreview.jsx
// 육아 테마 전용 미리보기 카드 모음.

import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';

function filterList(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

function ParentingThemePreview({ guide }) {
  if (!guide) {
    return null;
  }

  const generalTips = filterList(guide.generalTips);
  const emergencyContacts = filterList(guide.emergencyContacts);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="육아 테마 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {generalTips.length > 0 ? (
        <SectionCard title="전체 공통 팁" tone="neutral">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {generalTips.map((tip, index) => (
              <li key={`general-tip-${index}`}>{tip}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.ageGroups)
        ? guide.ageGroups
            .filter((group) => {
              const summary = typeof group?.focusSummary === 'string' ? group.focusSummary.trim() : '';
              const hasDetails =
                filterList(group?.developmentFocus).length > 0 ||
                filterList(group?.careTips).length > 0 ||
                filterList(group?.resources).length > 0;
              return summary.length > 0 || hasDetails;
            })
            .map((group, index) => {
              const development = filterList(group?.developmentFocus);
              const careTips = filterList(group?.careTips);
              const resources = filterList(group?.resources);
              return (
                <SectionCard
                  key={`preview-parenting-${index}`}
                  title={group?.ageRange || `연령대 ${index + 1}`}
                  tone="neutral"
                  badgeText="육아"
                >
                  {group?.focusSummary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{group.focusSummary}</p>
                  ) : null}
                  {development.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">발달 포인트</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {development.map((item, itemIndex) => (
                          <li key={`development-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {careTips.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">돌봄 팁</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {careTips.map((item, itemIndex) => (
                          <li key={`care-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {resources.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">추천 자료</p>
                      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-slate-600 underline-offset-2 dark:text-slate-300">
                        {resources.map((item, itemIndex) => (
                          <li key={`resource-${index}-${itemIndex}`}>{item}</li>
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
              <li key={`emergency-${index}`}>{contact}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

ParentingThemePreview.propTypes = {
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

ParentingThemePreview.defaultProps = {
  guide: null
};

export default ParentingThemePreview;
