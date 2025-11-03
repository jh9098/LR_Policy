// frontend/src/components/admin/StockThemePreview.jsx
// 주식정보 테마 전용 미리보기 카드.

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

function StockThemePreview({ guide }) {
  if (!guide) {
    return null;
  }

  const watchlist = filterList(guide.watchlist);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="주식정보 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {guide.marketSummary ? (
        <SectionCard title="시장 요약" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.marketSummary}</p>
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
                  {s.outlook ? <p className="text-xs text-slate-600 dark:text-slate-300">{s.outlook}</p> : null}
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
              .filter((c) => c && (c.name || c.thesis || (c.catalysts && c.catalysts.length) || (c.risks && c.risks.length) || c.valuation))
              .map((c, index) => (
                <li key={`company-${index}`} className="space-y-1">
                  {c.name ? <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p> : null}
                  {c.thesis ? <p className="text-xs text-slate-600 dark:text-slate-300">{c.thesis}</p> : null}
                  {Array.isArray(c.catalysts) && c.catalysts.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">촉매</p>
                      <ul className="list-disc pl-5 text-xs">
                        {c.catalysts.map((item, i) => (
                          <li key={`cat-${index}-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray(c.risks) && c.risks.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">리스크</p>
                      <ul className="list-disc pl-5 text-xs">
                        {c.risks.map((item, i) => (
                          <li key={`risk-${index}-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {c.valuation ? <p className="text-xs text-slate-600 dark:text-slate-300">{c.valuation}</p> : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {watchlist.length > 0 ? (
        <SectionCard title="워치리스트" tone="neutral" badgeText="관찰">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {watchlist.map((w, index) => (
              <li key={`watch-${index}`}>{w}</li>
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
        valuation: PropTypes.string
      })
    ),
    watchlist: PropTypes.arrayOf(PropTypes.string)
  })
};

StockThemePreview.defaultProps = {
  guide: null
};

export default StockThemePreview;


