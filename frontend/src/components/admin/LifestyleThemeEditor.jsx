// frontend/src/components/admin/LifestyleThemeEditor.jsx
// 생활정보 테마 전용 입력 UI (violet 톤 + 확장 필드: 카테고리/쿠폰/종료일 + 링크 유효성 힌트).

import PropTypes from 'prop-types';
import {
  cloneLifestyleGuide,
  createHotDeal,
  createLifestyleGuide,
  createLifestyleItem
} from '../../utils/themeDraftDefaults.js';
import SimpleListEditor from './SimpleListEditor.jsx';

const LIFESTYLE_CATEGORIES = [
  '행정/정부 서비스',
  '금융/세무',
  '소비/쇼핑',
  '생활관리',
  '주거/부동산',
  '교통/운전',
  '법률/권리',
  '직장/노무',
  '교육/자기계발',
  '디지털/보안',
  '여행/레저',
  '반려동물',
  '식생활/요리',
  '환경/안전',
  '커뮤니티/로컬생활',
  '문화/취미'
];

function LifestyleThemeEditor({ guide, onChange }) {
  const safeGuide = guide ?? createLifestyleGuide();

  const updateGuide = (updater) => {
    const draft = cloneLifestyleGuide(safeGuide);
    updater(draft);
    onChange(draft);
  };

  const handleOverviewChange = (event) => {
    updateGuide((draft) => {
      draft.overview = event.target.value;
    });
  };

  const handleQuickTipsChange = (list) => {
    updateGuide((draft) => {
      draft.quickTips = list;
    });
  };

  const handleAffiliateNotesChange = (list) => {
    updateGuide((draft) => {
      draft.affiliateNotes = list;
    });
  };

  const addHotItem = () => {
    updateGuide((draft) => {
      draft.hotItems.push(createLifestyleItem('새 아이템'));
    });
  };

  const removeHotItem = (index) => {
    updateGuide((draft) => {
      draft.hotItems.splice(index, 1);
    });
  };

  const handleHotItemField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.hotItems[index]) draft.hotItems[index] = createLifestyleItem();
      draft.hotItems[index] = { ...draft.hotItems[index], [field]: value };
    });
  };

  const addHotDeal = () => {
    updateGuide((draft) => {
      draft.hotDeals.push(createHotDeal('새 핫딜'));
    });
  };

  const removeHotDeal = (index) => {
    updateGuide((draft) => {
      draft.hotDeals.splice(index, 1);
    });
  };

  const handleHotDealField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.hotDeals[index]) draft.hotDeals[index] = createHotDeal();
      draft.hotDeals[index] = { ...draft.hotDeals[index], [field]: value };
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-500/40 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-violet-700 dark:text-violet-200">생활정보 · 트렌드 & 핫딜</h2>
        <p className="text-xs text-violet-600/80 dark:text-violet-200/80">
          실생활에서 바로 써먹는 꿀팁/아이템/핫딜을 JSON으로 관리합니다. 카테고리는 infoall 생활 카테고리 체계를 권장합니다.
        </p>
      </header>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">테마 개요</span>
        <textarea
          value={safeGuide.overview}
          onChange={handleOverviewChange}
          className="min-h-[120px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/40 dark:bg-slate-900 dark:text-slate-100"
          placeholder="생활정보 테마의 핵심 메시지를 요약해 주세요. (URL을 적으면 미리보기에서 자동 링크 처리)"
        />
      </label>

      <SimpleListEditor
        title="생활 꿀팁"
        description="일상 루틴, 소비 패턴, 행정 절차 등 즉시 적용 가능한 팁을 bullet 형태로 정리합니다. (URL 자동 링크)"
        items={safeGuide.quickTips}
        onChange={handleQuickTipsChange}
        addLabel="생활 팁 추가"
        itemPlaceholder="예: 정부24에서 등본은 모바일 간편인증으로 무료 발급 가능. https://www.gov.kr"
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-200">추천 아이템</h3>
          <button
            type="button"
            onClick={addHotItem}
            className="inline-flex items-center rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            아이템 추가
          </button>
        </div>

        {safeGuide.hotItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-violet-300 px-4 py-4 text-center text-xs text-violet-700 dark:border-violet-500/50 dark:text-violet-200">
            생활 아이템을 추가해 주세요. <strong>카테고리</strong>, 사용 이유, 구매 링크를 함께 적으면 좋아요.
          </p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.hotItems.map((item, index) => (
            <div
              key={`hot-item-${index}`}
              className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-500/40 dark:bg-slate-900"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">아이템 이름</span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleHotItemField(index, 'name', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 무선 청소기"
                  />
                </label>

                <label className="flex flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">카테고리</span>
                  <input
                    list="lifestyle-categories"
                    value={item.category ?? ''}
                    onChange={(e) => handleHotItemField(index, 'category', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 생활관리 / 디지털/보안 등"
                  />
                  <datalist id="lifestyle-categories">
                    {LIFESTYLE_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">추천 이유/사용 후기</span>
                <textarea
                  value={item.highlight}
                  onChange={(e) => handleHotItemField(index, 'highlight', e.target.value)}
                  className="min-h-[100px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="제품 장점, 사용 팁 등을 정리해 주세요. (URL 입력 시 미리보기 자동 링크)"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">구매/참고 링크</span>
                <input
                  type="url"
                  value={item.link}
                  onChange={(e) => handleHotItemField(index, 'link', e.target.value)}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="예: https://link.coupang.com/..."
                />
              </label>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                * 제휴 링크 사용 시 ‘제휴 링크 포함’ 고지 문구를 상세 하단에 고정해 주세요.
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeHotItem(index)}
                  className="inline-flex items-center rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:text-violet-200 dark:hover:bg-violet-500/10"
                >
                  아이템 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-200">핫딜 정보</h3>
          <button
            type="button"
            onClick={addHotDeal}
            className="inline-flex items-center rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            핫딜 추가
          </button>
        </div>

        {safeGuide.hotDeals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-violet-300 px-4 py-4 text-center text-xs text-violet-700 dark:border-violet-500/50 dark:text-violet-200">
            할인 이벤트·한정 특가를 기록해 두면 큐레이션이 쉬워집니다. (카테고리/쿠폰/종료일 입력 가능)
          </p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.hotDeals.map((deal, index) => (
            <div
              key={`hot-deal-${index}`}
              className="space-y-4 rounded-2xl border border-violet-200 bg-white p-5 dark:border-violet-500/40 dark:bg-slate-900"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">딜 제목</span>
                  <input
                    type="text"
                    value={deal.title}
                    onChange={(e) => handleHotDealField(index, 'title', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 블루에어 공기청정기 20% 할인"
                  />
                </label>

                <label className="flex flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">카테고리</span>
                  <input
                    list="lifestyle-categories"
                    value={deal.category ?? ''}
                    onChange={(e) => handleHotDealField(index, 'category', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 소비/쇼핑 / 식생활/요리 등"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">상세 설명</span>
                <textarea
                  value={deal.description}
                  onChange={(e) => handleHotDealField(index, 'description', e.target.value)}
                  className="min-h-[100px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="구성품, 제한 조건, 주의사항 등을 정리해 주세요. (URL 입력 시 미리보기 자동 링크)"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">링크</span>
                  <input
                    type="url"
                    value={deal.link}
                    onChange={(e) => handleHotDealField(index, 'link', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: https://link.coupang.com/..."
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">가격/혜택 정보</span>
                  <input
                    type="text"
                    value={deal.priceInfo}
                    onChange={(e) => handleHotDealField(index, 'priceInfo', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 카드 결제 시 129,000원 / 5% 적립"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">쿠폰 코드(선택)</span>
                  <input
                    type="text"
                    value={deal.couponCode ?? ''}
                    onChange={(e) => handleHotDealField(index, 'couponCode', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: SAVE10"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">종료일(선택)</span>
                  <input
                    type="date"
                    value={deal.expiresAt ?? ''}
                    onChange={(e) => handleHotDealField(index, 'expiresAt', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeHotDeal(index)}
                  className="inline-flex items-center rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:text-violet-200 dark:hover:bg-violet-500/10"
                >
                  딜 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SimpleListEditor
        title="제휴/운영 노트"
        description="쿠팡 파트너스 등 제휴 링크 운영 시 주의사항이나 메시지를 기록해 두세요."
        items={safeGuide.affiliateNotes}
        onChange={handleAffiliateNotesChange}
        addLabel="노트 추가"
        itemPlaceholder="예: 파트너스 고지 문구를 상세 페이지 하단에 고정해 주세요."
      />

      {/* datalist 공유 */}
      <datalist id="lifestyle-categories">
        {LIFESTYLE_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </section>
  );
}

LifestyleThemeEditor.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    quickTips: PropTypes.arrayOf(PropTypes.string),
    hotItems: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        category: PropTypes.string,
        highlight: PropTypes.string,
        link: PropTypes.string
      })
    ),
    hotDeals: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        category: PropTypes.string,
        description: PropTypes.string,
        link: PropTypes.string,
        priceInfo: PropTypes.string,
        couponCode: PropTypes.string,
        expiresAt: PropTypes.string
      })
    ),
    affiliateNotes: PropTypes.arrayOf(PropTypes.string)
  }),
  onChange: PropTypes.func.isRequired
};

LifestyleThemeEditor.defaultProps = { guide: null };

export default LifestyleThemeEditor;
