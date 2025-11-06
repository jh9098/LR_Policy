// frontend/src/components/issue/HealthGuideView.jsx
// 건강 테마 상세 렌더러 (URL 자동 링크 + emerald 톤)
import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';

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
            className="underline underline-offset-2 text-emerald-600 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:text-emerald-300"
          >
            {part.url}
          </a>
        )
      )}
    </>
  );
}

TextWithLinks.propTypes = { text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function HealthGuideView({ guide }) {
  if (!guide) return null;

  const lifestyleTips = normalizeList(guide.lifestyleTips);
  const emergencyGuide = normalizeList(guide.emergencyGuide);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="건강 테마 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.overview} />
          </p>
        </SectionCard>
      ) : null}

      {lifestyleTips.length > 0 ? (
        <SectionCard title="생활 습관 팁" tone="neutral" badgeText="생활">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {lifestyleTips.map((tip, index) => (
              <li key={`health-tip-${index}`}>
                <TextWithLinks text={tip} />
              </li>
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
              return (typeof condition?.name === 'string' && condition.name.trim().length > 0) || summary.length > 0 || hasDetails;
            })
            .map((condition, index) => {
              const warning = normalizeList(condition?.warningSigns);
              const care = normalizeList(condition?.careTips);
              const resources = normalizeList(condition?.resources);
              return (
                <SectionCard key={`health-condition-${index}`} title={condition?.name || `건강 주제 ${index + 1}`} tone="neutral" badgeText="건강">
                  {condition?.summary ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      <TextWithLinks text={condition.summary} />
                    </p>
                  ) : null}

                  {warning.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">경고 신호</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {warning.map((item, itemIndex) => (
                          <li key={`health-warning-${index}-${itemIndex}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {care.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">관리/돌봄 팁</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {care.map((item, itemIndex) => (
                          <li key={`health-care-${index}-${itemIndex}`}>
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
                          <li key={`health-resource-${index}-${itemIndex}`}>
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

      {emergencyGuide.length > 0 ? (
        <SectionCard title="긴급 대응 가이드" tone="impact" badgeText="긴급">
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {emergencyGuide.map((item, index) => (
              <li key={`health-emergency-${index}`}>
                <TextWithLinks text={item} />
              </li>
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

HealthGuideView.defaultProps = { guide: null };

export default HealthGuideView;
