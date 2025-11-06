// frontend/src/components/admin/StockThemePreview.jsx
// 주식정보 테마 전용 미리보기 카드 (amber 톤 가이드 + 텍스트 내 URL 자동 링크)

import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';

function filterList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

// 텍스트 안의 URL을 자동으로 <a>로 바꿔 렌더링
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
            className="underline underline-offset-2 text-amber-600 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-amber-300"
          >
            {part.url}
          </a>
        )
      )}
    </>
  );
}

TextWithLinks.propTypes = { text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function StockThemePreview({ guide }) {
  if (!guide) return null;

  const watchlist = filterList(guide.watchlist);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="주식정보 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.overview} />
          </p>
        </SectionCard>
      ) : null}

      {guide.marketSummary ? (
        <SectionCard title="시장 요약" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.marketSummary} />
          </p>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.sectorHighlights) && guide.sectorHighlights.length > 0 ? (
        <SectionCard title="섹터 하이라이트" tone="neutral" badgeText="섹터">
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.sectorHighlights
              .filter((s) => s && (s.name || s.outlook || (s.leaders && s.leaders.length > 0)))
              .map((s, index) => (
                <li key={`sector-${index}`} className="space-y-1">
                  {s.name ? <p className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</p> : null}
                  {s.outlook ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <TextWithLinks text={s.outlook} />
                    </p>
                  ) : null}
                  {Array.isArray(s.leaders) && s.leaders.length > 0 ? (
                    <ul className="list-disc pl-5 text-xs">
                      {s.leaders.map((name, i) => (
                        <li key={`leader-${index}-${i}`}>{name}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.companyAnalyses) && guide.companyAnalyses.length > 0 ? (
        <SectionCard title="기업 분석" tone="impact" badgeText="기업">
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.companyAnalyses
              .filter(
                (c) =>
                  c &&
                  (c.name ||
                    c.thesis ||
                    (c.catalysts && c.catalysts.length) ||
                    (c.risks && c.risks.length) ||
                    c.valuation ||
                    c.technicalLevels)
              )
              .map((c, index) => (
                <li key={`company-${index}`} className="space-y-1">
                  {c.name ? <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p> : null}
                  {c.thesis ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <TextWithLinks text={c.thesis} />
                    </p>
                  ) : null}
                  {Array.isArray(c.catalysts) && c.catalysts.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">촉매</p>
                      <ul className="list-disc pl-5 text-xs">
                        {c.catalysts.map((item, i) => (
                          <li key={`cat-${index}-${i}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(c.risks) && c.risks.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">리스크</p>
                      <ul className="list-disc pl-5 text-xs">
                        {c.risks.map((item, i) => (
                          <li key={`risk-${index}-${i}`}>
                            <TextWithLinks text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {c.valuation ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <TextWithLinks text={c.valuation} />
                    </p>
                  ) : null}
                  {c.technicalLevels ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">기술적 구간</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <TextWithLinks text={c.technicalLevels} />
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {watchlist.length > 0 ? (
        <SectionCard title="워치리스트" tone="neutral" badgeText="관찰">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {watchlist.map((w, index) => (
              <li key={`watch-${index}`}>
                <TextWithLinks text={w} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

StockThemePreview.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    marketSummary: PropTypes.string,
    sectorHighlights: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        outlook: PropTypes.string,
        leaders: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    companyAnalyses: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        thesis: PropTypes.string,
        catalysts: PropTypes.arrayOf(PropTypes.string),
        risks: PropTypes.arrayOf(PropTypes.string),
        valuation: PropTypes.string,
        technicalLevels: PropTypes.string
      })
    ),
    watchlist: PropTypes.arrayOf(PropTypes.string)
  })
};

StockThemePreview.defaultProps = { guide: null };

export default StockThemePreview;
