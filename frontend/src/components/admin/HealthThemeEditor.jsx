// frontend/src/components/admin/HealthThemeEditor.jsx
// 건강 테마 전용 입력 UI.

import PropTypes from 'prop-types';
import {
  HEALTH_CONDITION_PRESETS,
  cloneHealthGuide,
  createHealthCondition,
  createHealthGuide
} from '../../utils/themeDraftDefaults.js';
import SimpleListEditor from './SimpleListEditor.jsx';

function HealthThemeEditor({ guide, onChange }) {
  const safeGuide = guide ?? createHealthGuide({ withPresets: true });

  const updateGuide = (updater) => {
    const draft = cloneHealthGuide(safeGuide);
    updater(draft);
    onChange(draft);
  };

  const handleOverviewChange = (event) => {
    updateGuide((draft) => {
      draft.overview = event.target.value;
    });
  };

  const handleLifestyleTips = (list) => {
    updateGuide((draft) => {
      draft.lifestyleTips = list;
    });
  };

  const handleEmergencyGuide = (list) => {
    updateGuide((draft) => {
      draft.emergencyGuide = list;
    });
  };

  const addCondition = () => {
    updateGuide((draft) => {
      draft.conditions.push(createHealthCondition('새 질환'));
    });
  };

  const removeCondition = (index) => {
    updateGuide((draft) => {
      draft.conditions.splice(index, 1);
    });
  };

  const handleConditionField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.conditions[index]) {
        draft.conditions[index] = createHealthCondition();
      }
      draft.conditions[index] = { ...draft.conditions[index], [field]: value };
    });
  };

  const handleConditionList = (index, field, list) => {
    updateGuide((draft) => {
      if (!draft.conditions[index]) {
        draft.conditions[index] = createHealthCondition();
      }
      draft.conditions[index] = { ...draft.conditions[index], [field]: list };
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm dark:border-sky-500/40 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-200">건강정보 · 상태별 가이드</h2>
        <p className="text-xs text-sky-600/80 dark:text-sky-200/80">
          추천 주제: {HEALTH_CONDITION_PRESETS.join(' / ')}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          질환별 증상 체크포인트, 돌봄/재활 팁, 신뢰할 수 있는 자료를 정리하고 필요하면 새 질환을 직접 추가해 주세요.
        </p>
      </header>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">건강 테마 개요</span>
        <textarea
          value={safeGuide.overview}
          onChange={handleOverviewChange}
          className="min-h-[120px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/40 dark:bg-slate-900 dark:text-slate-100"
          placeholder="전체 건강 테마에서 전달할 핵심 메시지를 정리해 주세요."
        />
      </label>

      <SimpleListEditor
        title="생활 습관 팁"
        description="운동, 식습관, 수면 등 꾸준히 실천할 수 있는 행동을 정리합니다."
        items={safeGuide.lifestyleTips}
        onChange={handleLifestyleTips}
        addLabel="생활 팁 추가"
        itemPlaceholder="예: 하루 30분 이상 가벼운 유산소 운동으로 혈류를 개선하세요."
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-200">상태별 세부 가이드</h3>
          <button
            type="button"
            onClick={addCondition}
            className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            건강 주제 추가
          </button>
        </div>

        {safeGuide.conditions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-sky-300 px-4 py-4 text-center text-xs text-sky-600 dark:border-sky-500/50 dark:text-sky-200">
            다루고 싶은 건강 주제를 추가해 주세요.
          </p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.conditions.map((condition, index) => (
            <div
              key={`health-condition-${index}`}
              className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-5 dark:border-sky-500/40 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex flex-1 flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-sky-700 dark:text-sky-200">건강 주제 이름</span>
                  <input
                    type="text"
                    value={condition.name}
                    onChange={(event) => handleConditionField(index, 'name', event.target.value)}
                    className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 치매"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="inline-flex items-center rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/60 dark:hover:bg-sky-500/10"
                >
                  건강 주제 삭제
                </button>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">한눈에 보는 요약</span>
                <textarea
                  value={condition.summary}
                  onChange={(event) => handleConditionField(index, 'summary', event.target.value)}
                  className="min-h-[100px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="질환 원인, 진행 특징, 진료 시기 등을 요약해 주세요."
                />
              </label>

              <SimpleListEditor
                title="경고 신호"
                description="주의해야 할 초기 증상이나 악화 신호를 정리합니다."
                items={condition.warningSigns}
                onChange={(list) => handleConditionList(index, 'warningSigns', list)}
                addLabel="경고 신호 추가"
                itemPlaceholder="예: 최근 6개월 내 기억력 저하가 일상생활에 영향을 주기 시작함"
              />

              <SimpleListEditor
                title="관리/돌봄 팁"
                description="가족 돌봄, 재활, 약물 복용 등 실천 방법을 정리합니다."
                items={condition.careTips}
                onChange={(list) => handleConditionList(index, 'careTips', list)}
                addLabel="돌봄 팁 추가"
                itemPlaceholder="예: 주 3회 30분 산책으로 규칙적인 생활 리듬 유지"
              />

              <SimpleListEditor
                title="추천 자료"
                description="공공기관 리포트, 전문의 칼럼, 지원 서비스 등 신뢰할 수 있는 자료를 입력합니다."
                items={condition.resources}
                onChange={(list) => handleConditionList(index, 'resources', list)}
                addLabel="자료 추가"
                itemPlaceholder="예: 중앙치매센터 초기 진단 가이드 (https://...)"
              />
            </div>
          ))}
        </div>
      </div>

      <SimpleListEditor
        title="긴급 대응 가이드"
        description="악화 시 대처법, 응급실 방문 기준, 상담 전화 등 즉시 활용할 정보를 정리합니다."
        items={safeGuide.emergencyGuide}
        onChange={handleEmergencyGuide}
        addLabel="긴급 가이드 추가"
        itemPlaceholder="예: 호흡곤란·가슴통증이 동반되면 즉시 119 또는 1339에 연락"
      />
    </section>
  );
}

HealthThemeEditor.propTypes = {
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
  }),
  onChange: PropTypes.func.isRequired
};

HealthThemeEditor.defaultProps = {
  guide: null
};

export default HealthThemeEditor;
