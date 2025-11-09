// frontend/src/components/admin/HealthThemePreview.jsx
// 건강 테마 전용 미리보기 카드 (emerald 톤 + 리소스 URL 자동 링크 처리).

import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';
import { useSectionTitles } from '../../contexts/SectionTitlesContext.jsx';
import { getSectionTitleValue } from '../../constants/sectionTitleConfig.js';

function filterList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

function extractFirstUrl(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/https?:\/\/\S+/);
  return match?.[0] ?? null;
}

function ResourceItem({ text }) {
  const url = extractFirstUrl(text);
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        title={text}
      >
        {text}
      </a>
    );
  }
  return <span>{text}</span>;
}

ResourceItem.propTypes = { text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function HealthThemePreview({ guide }) {
  if (!guide) return null;

  const lifestyleTips = filterList(guide.lifestyleTips);
  const emergencyGuide = filterList(guide.emergencyGuide);
  const { titles } = useSectionTitles();
  const overviewTitle = getSectionTitleValue(titles, 'themes.health.overview.title');
  const lifestyleTitle = getSectionTitleValue(titles, 'themes.health.lifestyleTips.title');
  const lifestyleBadge = getSectionTitleValue(titles, 'themes.health.lifestyleTips.badge');
  const conditionFallback = getSectionTitleValue(titles, 'themes.health.conditionFallback.title');
  const conditionBadge = getSectionTitleValue(titles, 'themes.health.conditions.badge');
  const emergencyTitle = getSectionTitleValue(titles, 'themes.health.emergencyGuide.title');
  const emergencyBadge = getSectionTitleValue(titles, 'themes.health.emergencyGuide.badge');

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title={overviewTitle} tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {lifestyleTips.length > 0 ? (
        <SectionCard title={lifestyleTitle} tone="neutral" badgeText={lifestyleBadge}>
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
              const name = typeof condition?.name === 'string' ? condition.name.trim() : '';
              const summary = typeof condition?.summary === 'string' ? condition.summary.trim() : '';
              const hasDetails =
                filterList(condition?.warningSigns).length > 0 ||
                filterList(condition?.careTips).length > 0 ||
                filterList(condition?.resources).length > 0;
              return name.length > 0 || summary.length > 0 || hasDetails;
            })
            .map((condition, index) => {
              const warning = filterList(condition?.warningSigns);
              const care = filterList(condition?.careTips);
              const resources = filterList(condition?.resources);
              return (
                <SectionCard
                  key={`preview-health-${index}`}
                  title={condition?.name || `${conditionFallback} ${index + 1}`}
                  tone="neutral"
                  badgeText={conditionBadge}
                >
                  {condition?.summary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{condition.summary}</p>
                  ) : null}

                  {warning.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">경고 신호</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {warning.map((item, itemIndex) => (
                          <li key={`warning-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {care.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">관리/돌봄 팁</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {care.map((item, itemIndex) => (
                          <li key={`care-${index}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {resources.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">추천 자료</p>
                      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {resources.map((item, itemIndex) => (
                          <li key={`resource-${index}-${itemIndex}`}>
                            <ResourceItem text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })
        : null}

      {emergencyGuide.length > 0 ? (
        <SectionCard title={emergencyTitle} tone="impact" badgeText={emergencyBadge}>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {emergencyGuide.map((item, index) => (
              <li key={`emergency-guide-${index}`}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

HealthThemePreview.propTypes = {
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

HealthThemePreview.defaultProps = { guide: null };

export default HealthThemePreview;
