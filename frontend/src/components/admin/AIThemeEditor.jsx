// frontend/src/components/admin/AIThemeEditor.jsx
import PropTypes from 'prop-types';
import SimpleListEditor from './SimpleListEditor.jsx';
import {
  cloneAiGuide,
  createAiBlueprintSection,
  createAiConnection,
  createAiGuide,
  createAiSubcategoryFocus
} from '../../utils/themeDraftDefaults.js';

const CONNECTION_OPTIONS = [
  { value: 'parentingGuide', label: 'Parenting Guide 연계' },
  { value: 'lifestyleGuide', label: 'Lifestyle Guide 연계' },
  { value: 'supportGuide', label: 'Support Guide 연계' },
  { value: 'other', label: '기타(직접 입력)' }
];

function AIThemeEditor({ guide, onChange }) {
  const safeGuide = cloneAiGuide(guide ?? createAiGuide());

  const updateGuide = (updater) => {
    const draft = cloneAiGuide(guide ?? createAiGuide());
    updater(draft);
    onChange(draft);
  };

  const handleSummaryCardBullets = (items) => {
    updateGuide((draft) => {
      draft.summaryCardBullets = items;
    });
  };

  const handleBackgroundInsights = (items) => {
    updateGuide((draft) => {
      draft.backgroundInsights = items;
    });
  };

  const handleKeyActionSteps = (items) => {
    updateGuide((draft) => {
      draft.keyActionSteps = items;
    });
  };

  const handleImpactField = (field, value) => {
    updateGuide((draft) => {
      draft.impact = {
        ...draft.impact,
        [field]: value
      };
    });
  };

  const addConnection = () => {
    updateGuide((draft) => {
      draft.connectionGuides.push(createAiConnection());
    });
  };

  const updateConnectionField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.connectionGuides[index]) {
        draft.connectionGuides[index] = createAiConnection();
      }
      draft.connectionGuides[index] = {
        ...draft.connectionGuides[index],
        [field]: value
      };
    });
  };

  const removeConnection = (index) => {
    updateGuide((draft) => {
      draft.connectionGuides.splice(index, 1);
    });
  };

  const handleBlueprintOverviewChange = (event) => {
    const { value } = event.target;
    updateGuide((draft) => {
      draft.categoryBlueprint.overview = value;
    });
  };

  const addBlueprintSection = () => {
    updateGuide((draft) => {
      draft.categoryBlueprint.sections.push(createAiBlueprintSection());
    });
  };

  const updateBlueprintSectionField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.categoryBlueprint.sections[index]) {
        draft.categoryBlueprint.sections[index] = createAiBlueprintSection();
      }
      draft.categoryBlueprint.sections[index] = {
        ...draft.categoryBlueprint.sections[index],
        [field]: value
      };
    });
  };

  const updateBlueprintSectionChecklist = (index, items) => {
    updateGuide((draft) => {
      if (!draft.categoryBlueprint.sections[index]) {
        draft.categoryBlueprint.sections[index] = createAiBlueprintSection();
      }
      draft.categoryBlueprint.sections[index] = {
        ...draft.categoryBlueprint.sections[index],
        checklist: items
      };
    });
  };

  const removeBlueprintSection = (index) => {
    updateGuide((draft) => {
      draft.categoryBlueprint.sections.splice(index, 1);
    });
  };

  const addSubcategoryFocus = () => {
    updateGuide((draft) => {
      draft.categoryBlueprint.subcategoryFocus.push(createAiSubcategoryFocus());
    });
  };

  const updateSubcategoryFocusField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.categoryBlueprint.subcategoryFocus[index]) {
        draft.categoryBlueprint.subcategoryFocus[index] = createAiSubcategoryFocus();
      }
      draft.categoryBlueprint.subcategoryFocus[index] = {
        ...draft.categoryBlueprint.subcategoryFocus[index],
        [field]: value
      };
    });
  };

  const updateSubcategoryFocusHighlights = (index, items) => {
    updateGuide((draft) => {
      if (!draft.categoryBlueprint.subcategoryFocus[index]) {
        draft.categoryBlueprint.subcategoryFocus[index] = createAiSubcategoryFocus();
      }
      draft.categoryBlueprint.subcategoryFocus[index] = {
        ...draft.categoryBlueprint.subcategoryFocus[index],
        highlights: items
      };
    });
  };

  const removeSubcategoryFocus = (index) => {
    updateGuide((draft) => {
      draft.categoryBlueprint.subcategoryFocus.splice(index, 1);
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm dark:border-cyan-500/40 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-cyan-700 dark:text-cyan-200">AI 테마 공통 구조</h2>
        <p className="text-xs text-cyan-700/80 dark:text-cyan-200/80">
          “어떤 사람에게 어떤 상황에서 무엇을 해결하는지”가 드러나도록 요약/배경/실행 단계를 채워 주세요.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          핵심 실행 단위는 “1) ~을 클릭한다”처럼 구체적으로 작성하고, 필요 시 다른 테마 가이드와 연결할 수 있습니다.
        </p>
      </header>

      <SimpleListEditor
        title="요약 카드 Bullet"
        description="이 글로 할 수 있게 되는 것 3가지 정도를 bullet 형태로 정리하세요."
        items={safeGuide.summaryCardBullets}
        onChange={handleSummaryCardBullets}
        addLabel="요약 항목 추가"
        itemPlaceholder="예: 반복 보고서를 10분 만에 자동 작성"
        tone="cyan"
      />

      <SimpleListEditor
        title="배경 설명"
        description="왜 지금 중요한 주제인지, 실제 업무/생활 문제를 2~3 문단으로 적어 주세요."
        items={safeGuide.backgroundInsights}
        onChange={handleBackgroundInsights}
        addLabel="배경 문단 추가"
        itemPlaceholder="예: 생성형 AI 도입으로 문서 작업 속도가 빨라졌지만, 보안 문제가 남아있다."
        tone="cyan"
      />

      <SimpleListEditor
        title="핵심 실행 단계"
        description="실행 단위로 1) 2) 형태의 단계를 작성하세요."
        items={safeGuide.keyActionSteps}
        onChange={handleKeyActionSteps}
        addLabel="실행 단계 추가"
        itemPlaceholder="예: 1) 회사 템플릿을 열고 2) 프롬프트를 붙여넣는다"
        tone="cyan"
      />

      <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-500/40 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-100">생활/업무 영향</h3>
        <p className="mt-1 text-xs text-cyan-700/80 dark:text-cyan-200/70">누가 꼭 봐야 하는지, 기대 효과, 주의점을 각각 명시해 주세요.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">대상</span>
            <input
              type="text"
              value={safeGuide.impact.targetAudience}
              onChange={(event) => handleImpactField('targetAudience', event.target.value)}
              className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
              placeholder="예: 주 3회 보고서를 작성하는 팀장"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">효과</span>
            <input
              type="text"
              value={safeGuide.impact.expectedEffect}
              onChange={(event) => handleImpactField('expectedEffect', event.target.value)}
              className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
              placeholder="예: 매주 2시간 절약, 오류 감소"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">주의</span>
            <input
              type="text"
              value={safeGuide.impact.caution}
              onChange={(event) => handleImpactField('caution', event.target.value)}
              className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
              placeholder="예: 회사 데이터 외부 전송 금지"
            />
          </label>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-200 bg-white/70 p-4 dark:border-cyan-500/40 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-100">연결 가이드</h3>
            <p className="text-xs text-cyan-700/80 dark:text-cyan-200/70">다른 테마(Parenting/Lifestyle/Support)와 연결되면 선택 후 설명을 추가하세요.</p>
          </div>
          <button
            type="button"
            onClick={addConnection}
            className="inline-flex items-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            연결 추가
          </button>
        </div>
        {safeGuide.connectionGuides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-cyan-200 px-4 py-3 text-center text-xs text-cyan-600 dark:border-cyan-500/40 dark:text-cyan-200/70">
            아직 연결 가이드가 없습니다. “연결 추가” 버튼을 눌러 다른 테마와의 연관성을 기록하세요.
          </p>
        ) : null}
        <div className="space-y-4">
          {safeGuide.connectionGuides.map((connection, index) => (
            <div
              key={`connection-${index}`}
              className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-500/40 dark:bg-slate-900/60"
            >
              <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
                <label className="flex flex-col gap-2 text-sm md:w-1/3">
                  <span className="font-medium">연결 타입</span>
                  <select
                    value={connection.type}
                    onChange={(event) => updateConnectionField(index, 'type', event.target.value)}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {CONNECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="font-medium">연결 제목</span>
                  <input
                    type="text"
                    value={connection.label}
                    onChange={(event) => updateConnectionField(index, 'label', event.target.value)}
                    className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 3세 육아 루틴과 연계"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">설명</span>
                <textarea
                  value={connection.description}
                  onChange={(event) => updateConnectionField(index, 'description', event.target.value)}
                  className="min-h-[80px] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="예: 육아 루틴 문서에서 일일 학습 프롬프트를 참고할 수 있도록 링크"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeConnection(index)}
                  className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                >
                  연결 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-cyan-200 bg-white/80 p-5 dark:border-cyan-500/40 dark:bg-slate-900/50">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-100">카테고리별 추천 구조</h3>
          <p className="text-xs text-cyan-700/80 dark:text-cyan-200/70">
            선택한 상위 카테고리/하위 카테고리 조합에 맞는 구성 요소를 정리하세요.
          </p>
        </header>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">전체 개요</span>
          <textarea
            value={safeGuide.categoryBlueprint.overview}
            onChange={handleBlueprintOverviewChange}
            className="min-h-[100px] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/40 dark:bg-slate-900 dark:text-slate-100"
            placeholder="예: AI 기초·트렌드 글에서는 개념 요약 → 중요성 → 타임라인 → 헷갈리는 포인트 → 추가 키워드 순으로 구성"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">상위 카테고리 섹션</h4>
            <button
              type="button"
              onClick={addBlueprintSection}
              className="inline-flex items-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              섹션 추가
            </button>
          </div>

          {safeGuide.categoryBlueprint.sections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-cyan-200 px-4 py-3 text-center text-xs text-cyan-600 dark:border-cyan-500/40 dark:text-cyan-200/70">
              카테고리 구조를 추가하면 슬라이드/스크립트 추출 시 그대로 활용할 수 있습니다.
            </p>
          ) : null}

          <div className="space-y-4">
            {safeGuide.categoryBlueprint.sections.map((section, index) => (
              <div
                key={`blueprint-section-${index}`}
                className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-500/40 dark:bg-slate-900/60"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <label className="flex flex-1 flex-col gap-2 text-sm">
                    <span className="font-medium">섹션 제목</span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) => updateBlueprintSectionField(index, 'title', event.target.value)}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="예: 개념 한입 요약"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeBlueprintSection(index)}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  >
                    섹션 삭제
                  </button>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">설명</span>
                  <textarea
                    value={section.description}
                    onChange={(event) => updateBlueprintSectionField(index, 'description', event.target.value)}
                    className="min-h-[80px] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 중학생도 이해할 수 있는 수준으로 3~4줄 요약"
                  />
                </label>
                <SimpleListEditor
                  title="체크리스트"
                  description="이 섹션에서 반드시 다룰 세부 항목을 적어 주세요."
                  items={section.checklist}
                  onChange={(items) => updateBlueprintSectionChecklist(index, items)}
                  addLabel="항목 추가"
                  itemPlaceholder="예: 핵심 용어 2~3개 정의"
                  tone="cyan"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">하위카테고리 포커스</h4>
            <button
              type="button"
              onClick={addSubcategoryFocus}
              className="inline-flex items-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              포커스 추가
            </button>
          </div>

          {safeGuide.categoryBlueprint.subcategoryFocus.length === 0 ? (
            <p className="rounded-lg border border-dashed border-cyan-200 px-4 py-3 text-center text-xs text-cyan-600 dark:border-cyan-500/40 dark:text-cyan-200/70">
              하위카테고리별로 강조할 포인트(비유, 실생활 예시 등)를 정리하면 콘텐츠 일관성을 유지하기 쉽습니다.
            </p>
          ) : null}

          <div className="space-y-4">
            {safeGuide.categoryBlueprint.subcategoryFocus.map((focus, index) => (
              <div
                key={`subcategory-focus-${index}`}
                className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 dark:border-cyan-500/40 dark:bg-slate-900/60"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <label className="flex flex-1 flex-col gap-2 text-sm">
                    <span className="font-medium">포커스 제목</span>
                    <input
                      type="text"
                      value={focus.title}
                      onChange={(event) => updateSubcategoryFocusField(index, 'title', event.target.value)}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="예: AI 용어사전"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSubcategoryFocus(index)}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  >
                    포커스 삭제
                  </button>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">요약</span>
                  <textarea
                    value={focus.summary}
                    onChange={(event) => updateSubcategoryFocusField(index, 'summary', event.target.value)}
                    className="min-h-[80px] rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/50 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 한 줄 정의 + 비유 + 실생활 예시 + 더 파고들 키워드"
                  />
                </label>
                <SimpleListEditor
                  title="강조 포인트"
                  description="해당 하위카테고리에서 반드시 언급할 핵심 포인트를 정리하세요."
                  items={focus.highlights}
                  onChange={(items) => updateSubcategoryFocusHighlights(index, items)}
                  addLabel="포인트 추가"
                  itemPlaceholder="예: 비유 - 'AI는 전기처럼 보이는 곳마다 스며든다'"
                  tone="cyan"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

AIThemeEditor.propTypes = {
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
        type: PropTypes.oneOf(['parentingGuide', 'lifestyleGuide', 'supportGuide', 'other']),
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
  }),
  onChange: PropTypes.func.isRequired
};

AIThemeEditor.defaultProps = {
  guide: undefined
};

export default AIThemeEditor;
