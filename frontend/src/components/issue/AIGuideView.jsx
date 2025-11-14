// frontend/src/components/issue/AIGuideView.jsx
import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';
import { useSectionTitles } from '../../contexts/SectionTitlesContext.jsx';
import { getSectionTitleValue } from '../../constants/sectionTitleConfig.js';

function normalizeList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

function getConnections(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      type: typeof item?.type === 'string' ? item.type : 'other',
      label: typeof item?.label === 'string' ? item.label.trim() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : ''
    }))
    .filter((item) => item.label || item.description);
}

function getSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      title: typeof section?.title === 'string' ? section.title.trim() : '',
      description: typeof section?.description === 'string' ? section.description.trim() : '',
      checklist: normalizeList(section?.checklist)
    }))
    .filter((section) => section.title || section.description || section.checklist.length > 0);
}

function getFocuses(focuses) {
  if (!Array.isArray(focuses)) return [];
  return focuses
    .map((focus) => ({
      title: typeof focus?.title === 'string' ? focus.title.trim() : '',
      summary: typeof focus?.summary === 'string' ? focus.summary.trim() : '',
      highlights: normalizeList(focus?.highlights)
    }))
    .filter((focus) => focus.title || focus.summary || focus.highlights.length > 0);
}

function hasImpactData(impact) {
  if (!impact) return false;
  return Boolean(impact.targetAudience || impact.expectedEffect || impact.caution);
}

const CONNECTION_LABELS = {
  parentingGuide: 'Parenting Guide',
  lifestyleGuide: 'Lifestyle Guide',
  supportGuide: 'Support Guide',
  other: '기타'
};

function AIGuideView({ guide }) {
  if (!guide) return null;

  const { titles } = useSectionTitles();
  const summaryTitle = getSectionTitleValue(titles, 'themes.ai.summaryCard.title');
  const summaryBadge = getSectionTitleValue(titles, 'themes.ai.summaryCard.badge');
  const backgroundTitle = getSectionTitleValue(titles, 'themes.ai.background.title');
  const backgroundBadge = getSectionTitleValue(titles, 'themes.ai.background.badge');
  const actionTitle = getSectionTitleValue(titles, 'themes.ai.keyActionSteps.title');
  const actionBadge = getSectionTitleValue(titles, 'themes.ai.keyActionSteps.badge');
  const impactTitle = getSectionTitleValue(titles, 'themes.ai.impact.title');
  const impactBadge = getSectionTitleValue(titles, 'themes.ai.impact.badge');
  const connectionTitle = getSectionTitleValue(titles, 'themes.ai.connectionGuides.title');
  const connectionBadge = getSectionTitleValue(titles, 'themes.ai.connectionGuides.badge');
  const blueprintTitle = getSectionTitleValue(titles, 'themes.ai.categoryBlueprint.title');
  const blueprintBadge = getSectionTitleValue(titles, 'themes.ai.categoryBlueprint.badge');
  const focusTitle = getSectionTitleValue(titles, 'themes.ai.subcategoryFocus.title');
  const focusBadge = getSectionTitleValue(titles, 'themes.ai.subcategoryFocus.badge');

  const summaryItems = normalizeList(guide.summaryCardBullets);
  const backgroundItems = normalizeList(guide.backgroundInsights);
  const actionItems = normalizeList(guide.keyActionSteps);
  const connections = getConnections(guide.connectionGuides);
  const sections = getSections(guide?.categoryBlueprint?.sections);
  const focuses = getFocuses(guide?.categoryBlueprint?.subcategoryFocus);
  const overviewText = typeof guide?.categoryBlueprint?.overview === 'string'
    ? guide.categoryBlueprint.overview.trim()
    : '';

  return (
    <div className="space-y-5">
      {summaryItems.length > 0 ? (
        <SectionCard title={summaryTitle} tone="neutral" badgeText={summaryBadge}>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {summaryItems.map((item, index) => (
              <li key={`ai-summary-${index}`}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {backgroundItems.length > 0 ? (
        <SectionCard title={backgroundTitle} tone="neutral" badgeText={backgroundBadge}>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {backgroundItems.map((item, index) => (
              <p key={`ai-background-${index}`}>{item}</p>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {actionItems.length > 0 ? (
        <SectionCard title={actionTitle} tone="impact" badgeText={actionBadge}>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {actionItems.map((item, index) => (
              <li key={`ai-action-${index}`}>{item}</li>
            ))}
          </ol>
        </SectionCard>
      ) : null}

      {hasImpactData(guide.impact) ? (
        <SectionCard title={impactTitle} tone="impact" badgeText={impactBadge}>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.impact?.targetAudience ? (
              <li>
                <span className="font-semibold text-cyan-700 dark:text-cyan-200">대상:</span> {guide.impact.targetAudience}
              </li>
            ) : null}
            {guide.impact?.expectedEffect ? (
              <li>
                <span className="font-semibold text-cyan-700 dark:text-cyan-200">효과:</span> {guide.impact.expectedEffect}
              </li>
            ) : null}
            {guide.impact?.caution ? (
              <li>
                <span className="font-semibold text-cyan-700 dark:text-cyan-200">주의:</span> {guide.impact.caution}
              </li>
            ) : null}
          </ul>
        </SectionCard>
      ) : null}

      {connections.length > 0 ? (
        <SectionCard title={connectionTitle} tone="neutral" badgeText={connectionBadge}>
          <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {connections.map((item, index) => (
              <li key={`ai-connection-${index}`} className="rounded-lg border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-500/30 dark:bg-slate-900/40">
                {item.label ? (
                  <p className="font-semibold text-cyan-700 dark:text-cyan-200">{item.label}</p>
                ) : null}
                <p className="text-xs uppercase tracking-wider text-cyan-500 dark:text-cyan-300">
                  {CONNECTION_LABELS[item.type] || CONNECTION_LABELS.other}
                </p>
                {item.description ? (
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {(overviewText || sections.length > 0) ? (
        <SectionCard title={blueprintTitle} tone="neutral" badgeText={blueprintBadge}>
          <div className="space-y-4">
            {overviewText ? (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{overviewText}</p>
            ) : null}
            {sections.length > 0 ? (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={`ai-section-${index}`} className="space-y-2 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-500/30 dark:bg-slate-900/40">
                    {section.title ? (
                      <p className="font-semibold text-cyan-700 dark:text-cyan-200">{section.title}</p>
                    ) : null}
                    {section.description ? (
                      <p className="text-sm text-slate-700 dark:text-slate-200">{section.description}</p>
                    ) : null}
                    {section.checklist.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {section.checklist.map((item, itemIndex) => (
                          <li key={`ai-section-${index}-item-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {focuses.length > 0 ? (
        <SectionCard title={focusTitle} tone="neutral" badgeText={focusBadge}>
          <div className="space-y-4">
            {focuses.map((focus, index) => (
              <div key={`ai-focus-${index}`} className="space-y-2 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-500/30 dark:bg-slate-900/40">
                {focus.title ? (
                  <p className="font-semibold text-cyan-700 dark:text-cyan-200">{focus.title}</p>
                ) : null}
                {focus.summary ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">{focus.summary}</p>
                ) : null}
                {focus.highlights.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                    {focus.highlights.map((item, itemIndex) => (
                      <li key={`ai-focus-${index}-item-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

AIGuideView.propTypes = {
  guide: PropTypes.shape({
    summaryCardBullets: PropTypes.arrayOf(PropTypes.string),
    backgroundInsights: PropTypes.arrayOf(PropTypes.string),
    keyActionSteps: PropTypes.arrayOf(PropTypes.string),
    impact: PropTypes.shape({
      targetAudience: PropTypes.string,
      expectedEffect: PropTypes.string,
      caution: PropTypes.string
    }),
    connectionGuides: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        label: PropTypes.string,
        description: PropTypes.string
      })
    ),
    categoryBlueprint: PropTypes.shape({
      overview: PropTypes.string,
      sections: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          description: PropTypes.string,
          checklist: PropTypes.arrayOf(PropTypes.string)
        })
      ),
      subcategoryFocus: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          summary: PropTypes.string,
          highlights: PropTypes.arrayOf(PropTypes.string)
        })
      )
    })
  })
};

AIGuideView.defaultProps = {
  guide: null
};

export default AIGuideView;
