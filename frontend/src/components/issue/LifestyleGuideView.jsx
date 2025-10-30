// frontend/src/components/issue/LifestyleGuideView.jsx
// 공개 이슈 페이지에서 생활정보 테마 전용 가이드를 렌더링한다.

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

function LifestyleGuideView({ guide }) {
  if (!guide) {
    return null;
  }

  const quickTips = normalizeList(guide.quickTips);
  const affiliateNotes = normalizeList(guide.affiliateNotes);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="생활정보 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {quickTips.length > 0 ? (
        <SectionCard title="생활 꿀팁" tone="neutral" badgeText="TIP">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {quickTips.map((tip, index) => (
              <li key={`lifestyle-tip-${index}`}>{tip}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.hotItems) && guide.hotItems.length > 0 ? (
        <SectionCard title="추천 아이템" tone="neutral" badgeText="아이템">
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.hotItems
              .filter((item) => item && (item.name || item.highlight || item.link))
              .map((item, index) => (
                <li key={`lifestyle-item-${index}`} className="space-y-1">
                  {item.name ? (
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                  ) : null}
                  {item.highlight ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{item.highlight}</p>
                  ) : null}
                  {item.link ? (
                    <a
                      href={item.link}
                      className="text-xs font-semibold text-emerald-600 underline underline-offset-2 dark:text-emerald-300"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.link}
                    </a>
                  ) : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.hotDeals) && guide.hotDeals.length > 0 ? (
        <SectionCard title="핫딜 정보" tone="impact" badgeText="딜">
          <ul className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {guide.hotDeals
              .filter((deal) => deal && (deal.title || deal.description || deal.link || deal.priceInfo))
              .map((deal, index) => (
                <li key={`lifestyle-deal-${index}`} className="space-y-1">
                  {deal.title ? (
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{deal.title}</p>
                  ) : null}
                  {deal.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{deal.description}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {deal.link ? (
                      <a
                        href={deal.link}
                        className="font-semibold text-emerald-600 underline underline-offset-2 dark:text-emerald-300"
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
        <SectionCard title="제휴/운영 노트" tone="neutral" badgeText="운영">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {affiliateNotes.map((note, index) => (
              <li key={`lifestyle-affiliate-${index}`}>{note}</li>
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

LifestyleGuideView.defaultProps = {
  guide: null
};

export default LifestyleGuideView;
