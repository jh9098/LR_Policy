// frontend/src/components/admin/StockThemeEditor.jsx
// 주식정보 테마 전용 입력 UI.

import PropTypes from 'prop-types';
import {
  cloneStockGuide,
  createCompanyAnalysis,
  createSectorHighlight,
  createStockGuide
} from '../../utils/themeDraftDefaults.js';
import SimpleListEditor from './SimpleListEditor.jsx';

function StockThemeEditor({ guide, onChange }) {
  const safeGuide = guide ?? createStockGuide();

  const updateGuide = (updater) => {
    const draft = cloneStockGuide(safeGuide);
    updater(draft);
    onChange(draft);
  };

  const handleOverviewChange = (event) => {
    updateGuide((draft) => {
      draft.overview = event.target.value;
    });
  };

  const handleMarketSummaryChange = (event) => {
    updateGuide((draft) => {
      draft.marketSummary = event.target.value;
    });
  };

  // Sector highlights
  const addSector = () => {
    updateGuide((draft) => {
      draft.sectorHighlights.push(createSectorHighlight('새 섹터'));
    });
  };

  const removeSector = (index) => {
    updateGuide((draft) => {
      draft.sectorHighlights.splice(index, 1);
    });
  };

  const handleSectorField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.sectorHighlights[index]) {
        draft.sectorHighlights[index] = createSectorHighlight();
      }
      draft.sectorHighlights[index] = { ...draft.sectorHighlights[index], [field]: value };
    });
  };

  const handleSectorLeadersChange = (index, list) => {
    updateGuide((draft) => {
      if (!draft.sectorHighlights[index]) {
        draft.sectorHighlights[index] = createSectorHighlight();
      }
      draft.sectorHighlights[index].leaders = list;
    });
  };

  // Company analyses
  const addCompany = () => {
    updateGuide((draft) => {
      draft.companyAnalyses.push(createCompanyAnalysis('새 종목'));
    });
  };

  const removeCompany = (index) => {
    updateGuide((draft) => {
      draft.companyAnalyses.splice(index, 1);
    });
  };

  const handleCompanyField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.companyAnalyses[index]) {
        draft.companyAnalyses[index] = createCompanyAnalysis();
      }
      draft.companyAnalyses[index] = { ...draft.companyAnalyses[index], [field]: value };
    });
  };

  const handleCompanyArrayField = (index, field, list) => {
    updateGuide((draft) => {
      if (!draft.companyAnalyses[index]) {
        draft.companyAnalyses[index] = createCompanyAnalysis();
      }
      draft.companyAnalyses[index][field] = list;
    });
  };

  const handleWatchlistChange = (list) => {
    updateGuide((draft) => {
      draft.watchlist = list;
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-500/40 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-200">주식정보 · 섹터/기업 분석</h2>
        <p className="text-xs text-amber-700/80 dark:text-amber-200/80">시장 요약, 섹터 하이라이트, 기업 분석과 워치리스트를 JSON으로 관리합니다.</p>
      </header>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">테마 개요</span>
        <textarea
          value={safeGuide.overview}
          onChange={handleOverviewChange}
          className="min-h-[100px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
          placeholder="이번 카드의 핵심 메시지 요약"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">시장 요약</span>
        <textarea
          value={safeGuide.marketSummary}
          onChange={handleMarketSummaryChange}
          className="min-h-[100px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
          placeholder="지수/금리/환율/수급 등 핵심 요약"
        />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-200">섹터 하이라이트</h3>
          <button
            type="button"
            onClick={addSector}
            className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            섹터 추가
          </button>
        </div>

        {safeGuide.sectorHighlights.length === 0 ? (
          <p className="rounded-lg border border-dashed border-amber-300 px-4 py-4 text-center text-xs text-amber-700 dark:border-amber-500/50 dark:text-amber-200">주요 섹터와 대표 종목을 정리해 주세요.</p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.sectorHighlights.map((sector, index) => (
            <div key={`sector-${index}`} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/40 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex flex-1 flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200">섹터명</span>
                  <input
                    type="text"
                    value={sector.name}
                    onChange={(e) => handleSectorField(index, 'name', e.target.value)}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 반도체"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeSector(index)}
                  className="inline-flex items-center rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/60 dark:hover:bg-amber-500/10"
                >
                  섹터 삭제
                </button>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">전망 요약</span>
                <textarea
                  value={sector.outlook}
                  onChange={(e) => handleSectorField(index, 'outlook', e.target.value)}
                  className="min-h-[80px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="수요/공급, 가격, 정책 이슈 등"
                />
              </label>

              <SimpleListEditor
                title="대표 종목"
                description="티커/종목명을 한 줄씩 입력하세요."
                items={sector.leaders || []}
                onChange={(list) => handleSectorLeadersChange(index, list)}
                addLabel="종목 추가"
                itemPlaceholder="예: AAPL, NVDA"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-200">기업 분석</h3>
          <button
            type="button"
            onClick={addCompany}
            className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            기업 추가
          </button>
        </div>

        {safeGuide.companyAnalyses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-amber-300 px-4 py-4 text-center text-xs text-amber-700 dark:border-amber-500/50 dark:text-amber-200">핵심 기업의 투자 논지와 촉매/리스크를 정리해 주세요.</p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.companyAnalyses.map((c, index) => (
            <div key={`company-${index}`} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-500/40 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex flex-1 flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200">종목명</span>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => handleCompanyField(index, 'name', e.target.value)}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 삼성전자"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeCompany(index)}
                  className="inline-flex items-center rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/60 dark:hover:bg-amber-500/10"
                >
                  기업 삭제
                </button>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">투자 논지(Thesis)</span>
                <textarea
                  value={c.thesis}
                  onChange={(e) => handleCompanyField(index, 'thesis', e.target.value)}
                  className="min-h-[100px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="핵심 논지를 한 단락으로 작성"
                />
              </label>

              <SimpleListEditor
                title="촉매(Catalysts)"
                description="주가 상승을 촉발할 수 있는 이벤트를 bullet로 작성"
                items={c.catalysts || []}
                onChange={(list) => handleCompanyArrayField(index, 'catalysts', list)}
                addLabel="촉매 추가"
                itemPlaceholder="예: 신규 제품 출시, 원가 하락"
              />

              <SimpleListEditor
                title="리스크(Risks)"
                description="투자 논지를 훼손할 수 있는 리스크를 bullet로 작성"
                items={c.risks || []}
                onChange={(list) => handleCompanyArrayField(index, 'risks', list)}
                addLabel="리스크 추가"
                itemPlaceholder="예: 규제 강화, 수요 둔화"
              />

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">밸류에이션/메모</span>
                <textarea
                  value={c.valuation}
                  onChange={(e) => handleCompanyField(index, 'valuation', e.target.value)}
                  className="min-h-[80px] rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="밸류에이션 프레임(멀티플, 밴드), 목표가 근거 등"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <SimpleListEditor
        title="워치리스트"
        description="관찰이 필요한 종목/지표를 한 줄씩"
        items={safeGuide.watchlist}
        onChange={handleWatchlistChange}
        addLabel="항목 추가"
        itemPlaceholder="예: 달러인덱스, 유가, 특정 종목"
      />
    </section>
  );
}

StockThemeEditor.propTypes = {
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
  }),
  onChange: PropTypes.func.isRequired
};

StockThemeEditor.defaultProps = {
  guide: null
};

export default StockThemeEditor;


