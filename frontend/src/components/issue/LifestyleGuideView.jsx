// frontend/src/components/issue/LifestyleGuideView.jsx
// 생활정보 테마 상세 렌더러 (URL 자동 링크 + violet 톤)
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
            className="underline underline-offset-2 text-violet-600 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:text-violet-300"
          >
            {part.url}
          </a>
        )
      )}
    </>
  );
}

TextWithLinks.propTypes = { text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function LifestyleGuideView({ guide }) {
  if (!guide) return null;

  const quickTips = normalizeList(guide.quickTips);
  const affiliateNotes = normalizeList(guide.affiliateNotes);
  const { titles } = useSectionTitles();
  const overviewTitle = getSectionTitleValue(titles, 'themes.lifestyle.overview.title');
  const quickTipsTitle = getSectionTitleValue(titles, 'themes.lifestyle.quickTips.title');
  const quickTipsBadge = getSectionTitleValue(titles, 'themes.lifestyle.quickTips.badge');
  const hotItemsTitle = getSectionTitleValue(titles, 'themes.lifestyle.hotItems.title');
  const hotItemsBadge = getSectionTitleValue(titles, 'themes.lifestyle.hotItems.badge');
  const hotDealsTitle = getSectionTitleValue(titles, 'themes.lifestyle.hotDeals.title');
  const hotDealsBadge = getSectionTitleValue(titles, 'themes.lifestyle.hotDeals.badge');
  const affiliateTitle = getSectionTitleValue(titles, 'themes.lifestyle.affiliateNotes.title');
  const affiliateBadge = getSectionTitleValue(titles, 'themes.lifestyle.affiliateNotes.badge');

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title={overviewTitle} tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.overview} />
          </p>
        </SectionCard>
      ) : null}

      {quickTips.length > 0 ? (
        <SectionCard title={quickTipsTitle} tone="neutral" badgeText={quickTipsBadge}>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {quickTips.map((tip, index) => (
              <li key={`lifestyle-tip-${index}`}>
                <TextWithLinks text={tip} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.hotItems) && guide.hotItems.length > 0 ? (
        <SectionCard title={hotItemsTitle} tone="neutral" badgeText={hotItemsBadge}>
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.hotItems
              .filter((item) => item && (item.name || item.highlight || item.link))
              .map((item, index) => (
                <li key={`lifestyle-item-${index}`} className="space-y-1">
                  {item.name ? <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p> : null}
                  {item.highlight ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <TextWithLinks text={item.highlight} />
                    </p>
                  ) : null}
                  {item.link ? (
                    <a
                      href={item.link}
                      className="text-xs font-semibold text-violet-600 underline underline-offset-2 dark:text-violet-300"
                      target="_blank"
                      rel="noreferrer"
                    >
                      링크 바로가기
                    </a>
                  ) : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.hotDeals) && guide.hotDeals.length > 0 ? (
        <SectionCard title={hotDealsTitle} tone="impact" badgeText={hotDealsBadge}>
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.hotDeals
              .filter((deal) => deal && (deal.title || deal.description || deal.link || deal.priceInfo))
              .map((deal, index) => (
                <li key={`lifestyle-deal-${index}`} className="space-y-1">
                  {deal.title ? <p className="font-semibold text-slate-800 dark:text-slate-100">{deal.title}</p> : null}
                  {deal.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <TextWithLinks text={deal.description} />
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {deal.link ? (
                      <a
                        href={deal.link}
                        className="font-semibold text-violet-600 underline underline-offset-2 dark:text-violet-300"
                        target="_blank"
                        rel="noreferrer"
                      >
                        링크 바로가기
                      </a>
                    ) : null}
                    {deal.priceInfo ? <span className="text-slate-500 dark:text-slate-400">{deal.priceInfo}</span> : null}
                  </div>
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {affiliateNotes.length > 0 ? (
        <SectionCard title={affiliateTitle} tone="neutral" badgeText={affiliateBadge}>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {affiliateNotes.map((note, index) => (
              <li key={`lifestyle-affiliate-${index}`}>
                <TextWithLinks text={note} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

LifestyleGuideView.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    quickTips: PropTypes.arrayOf(PropTypes.string),
    hotItems: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        highlight: PropTypes.string,
        link: PropTypes.string
      })
    ),
    hotDeals: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
        link: PropTypes.string,
        priceInfo: PropTypes.string
      })
    ),
    affiliateNotes: PropTypes.arrayOf(PropTypes.string)
  })
};

LifestyleGuideView.defaultProps = { guide: null };

export default LifestyleGuideView;
