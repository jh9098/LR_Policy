// frontend/src/components/issue/ParentingGuideView.jsx
// 육아 테마 상세 렌더러 (URL 자동 링크 + sky 톤)
import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';
import { useSectionTitles } from '../../contexts/SectionTitlesContext.jsx';
import { getSectionTitleValue } from '../../constants/sectionTitleConfig.js';

function normalizeList(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim())).filter(Boolean);
}

// 텍스트 내 URL 자동 링크화
function splitByUrls(text) {
  if (typeof text !== 'string' || text.length === 0) return [text];
  const urlRegex = /https?:\/\/\S+/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ url: match[0] });
    lastIndex = urlRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

function TextWithLinks({ text }) {
  const parts = splitByUrls(text);
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 text-sky-600 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-300"
          >
            {part.url}
          </a>
        )
      )}
    </>
  );
}

TextWithLinks.propTypes = { text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function ParentingGuideView({ guide }) {
  if (!guide) return null;

  const generalTips = normalizeList(guide.generalTips);
  const emergencyContacts = normalizeList(guide.emergencyContacts);
  const { titles } = useSectionTitles();
  const overviewTitle = getSectionTitleValue(titles, 'themes.parenting.overview.title');
  const generalTipsTitle = getSectionTitleValue(titles, 'themes.parenting.generalTips.title');
  const generalTipsBadge = getSectionTitleValue(titles, 'themes.parenting.generalTips.badge');
  const ageGroupFallback = getSectionTitleValue(titles, 'themes.parenting.ageGroupFallback.title');
  const ageGroupBadge = getSectionTitleValue(titles, 'themes.parenting.ageGroups.badge') || generalTipsBadge;
  const emergencyTitle = getSectionTitleValue(titles, 'themes.parenting.emergencyContacts.title');
  const emergencyBadge = getSectionTitleValue(titles, 'themes.parenting.emergencyContacts.badge');

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title={overviewTitle} tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.overview} />
          </p>
        </SectionCard>
      ) : null}

      {generalTips.length > 0 ? (
        <SectionCard title={generalTipsTitle} tone="neutral" badgeText={generalTipsBadge}>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {generalTips.map((tip, index) => (
              <li key={`parenting-general-${index}`}>
                <TextWithLinks text={tip} />
              </li>
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
                  title={group?.ageRange || `${ageGroupFallback} ${index + 1}`}
                  tone="neutral"
                  badgeText={ageGroupBadge}
                >
                  {group?.focusSummary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      <TextWithLinks text={group.focusSummary} />
                    </p>
                  ) : null}

                  {development.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">발달 포인트</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {development.map((item, itemIndex) => (
                          <li key={`parenting-development-${index}-${itemIndex}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {careTips.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">돌봄 팁</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {careTips.map((item, itemIndex) => (
                          <li key={`parenting-care-${index}-${itemIndex}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {resources.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">추천 자료</p>
                      <ul className="space-y-1 text-xs leading-relaxed text-slate-600 underline-offset-2 dark:text-slate-300">
                        {resources.map((item, itemIndex) => (
                          <li key={`parenting-resource-${index}-${itemIndex}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })
        : null}

      {emergencyContacts.length > 0 ? (
        <SectionCard title={emergencyTitle} tone="impact" badgeText={emergencyBadge}>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {emergencyContacts.map((contact, index) => (
              <li key={`parenting-emergency-${index}`}>
                <TextWithLinks text={contact} />
              </li>
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

ParentingGuideView.defaultProps = { guide: null };

export default ParentingGuideView;
