// frontend/src/components/admin/ParentingThemeEditor.jsx
// 육아 테마 전용 입력 UI (sky 톤 + URL 안내 + 영유아 0~7세 권장 문구 반영)

import PropTypes from 'prop-types';
import {
  PARENTING_AGE_GROUP_PRESETS,
  cloneParentingGuide,
  createParentingAgeGroup,
  createParentingGuide
} from '../../utils/themeDraftDefaults.js';
import SimpleListEditor from './SimpleListEditor.jsx';

function ParentingThemeEditor({ guide, onChange }) {
  const safeGuide = guide ?? createParentingGuide({ withPresets: true });

  const updateGuide = (updater) => {
    const draft = cloneParentingGuide(safeGuide);
    updater(draft);
    onChange(draft);
  };

  const handleOverviewChange = (event) => {
    const { value } = event.target;
    updateGuide((draft) => {
      draft.overview = value;
    });
  };

  const addAgeGroup = () => {
    updateGuide((draft) => {
      draft.ageGroups.push(createParentingAgeGroup('새 연령대'));
    });
  };

  const removeAgeGroup = (index) => {
    updateGuide((draft) => {
      draft.ageGroups.splice(index, 1);
    });
  };

  const handleAgeGroupField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.ageGroups[index]) draft.ageGroups[index] = createParentingAgeGroup();
      draft.ageGroups[index] = { ...draft.ageGroups[index], [field]: value };
    });
  };

  const handleAgeGroupList = (index, field, list) => {
    updateGuide((draft) => {
      if (!draft.ageGroups[index]) draft.ageGroups[index] = createParentingAgeGroup();
      draft.ageGroups[index] = { ...draft.ageGroups[index], [field]: list };
    });
  };

  const handleGeneralTipsChange = (list) => {
    updateGuide((draft) => {
      draft.generalTips = list;
    });
  };

  const handleEmergencyContactsChange = (list) => {
    updateGuide((draft) => {
      draft.emergencyContacts = list;
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm dark:border-sky-500/30 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-200">육아정보 · 연령별 구성</h2>
        <p className="text-xs text-sky-600/80 dark:text-sky-200/80">
          기본 연령대 추천: {PARENTING_AGE_GROUP_PRESETS.join(' / ')}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          안내: <strong className="text-sky-700 dark:text-sky-300">영유아는 0~7세</strong>로 통합 권장(기존 0~5세 → 0~7세). 연령대 라벨은
          “영유아(0~7세) · 초등학생 · 중학생 · 고등학생”과 같이 큰 구간으로도 사용할 수 있어요.
        </p>
      </header>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">테마 개요</span>
        <textarea
          value={safeGuide.overview}
          onChange={handleOverviewChange}
          className="min-h-[120px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/50 dark:bg-slate-900 dark:text-slate-100"
          placeholder="전체 육아 정보를 한눈에 보여줄 개요를 입력하세요. (URL 입력 시 미리보기에서 자동 링크)"
        />
      </label>

      <SimpleListEditor
        title="전체 공통 팁"
        description="육아 전반에 적용되는 체크리스트나 생활 팁을 정리합니다. (URL 자동 링크)"
        items={safeGuide.generalTips}
        onChange={handleGeneralTipsChange}
        addLabel="공통 팁 추가"
        itemPlaceholder="예: 예방접종 일정은 출생 직후부터 캘린더에 기록해 두세요. https://nip.kdca.go.kr"
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-200">연령대별 세부 정보</h3>
          <button
            type="button"
            onClick={addAgeGroup}
            className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            연령대 추가
          </button>
        </div>

        {safeGuide.ageGroups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-sky-300 px-4 py-4 text-center text-xs text-sky-600 dark:border-sky-500/50 dark:text-sky-200">
            연령대를 추가해 세부 정보를 채워주세요.
          </p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.ageGroups.map((group, index) => (
            <div
              key={`parenting-group-${index}`}
              className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 dark:border-sky-500/40 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex flex-1 flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-sky-700 dark:text-sky-200">연령대 이름</span>
                  <input
                    type="text"
                    value={group.ageRange}
                    onChange={(event) => handleAgeGroupField(index, 'ageRange', event.target.value)}
                    className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 영유아(0~7세) / 초등학생 / 중학생 / 고등학생"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeAgeGroup(index)}
                  className="inline-flex items-center rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/60 dark:text-sky-200 dark:hover:bg-sky-500/10"
                >
                  연령대 삭제
                </button>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">핵심 요약</span>
                <textarea
                  value={group.focusSummary}
                  onChange={(event) => handleAgeGroupField(index, 'focusSummary', event.target.value)}
                  className="min-h-[100px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-500/50 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="발달 포인트와 부모 주의점을 한 문단으로 정리하세요. (URL 입력 시 미리보기에서 자동 링크)"
                />
              </label>

              <SimpleListEditor
                title="발달 포인트"
                description="연령대별 성장/발달 특징을 bullet 형태로 입력합니다."
                items={group.developmentFocus}
                onChange={(list) => handleAgeGroupList(index, 'developmentFocus', list)}
                addLabel="발달 포인트 추가"
                itemPlaceholder="예: 4~6세 언어폭발기 — 질문에 충분히 대답하고 책 읽기 루틴을 만듭니다."
              />

              <SimpleListEditor
                title="돌봄 팁"
                description="수면 루틴, 놀이, 식습관 등 실전 노하우를 정리합니다."
                items={group.careTips}
                onChange={(list) => handleAgeGroupList(index, 'careTips', list)}
                addLabel="돌봄 팁 추가"
                itemPlaceholder="예: 취침 1시간 전 스크린 오프, 낮 활동량 확보로 야간 각성 감소."
              />

              <SimpleListEditor
                title="추천 자료"
                description="공공기관 가이드, 전문가 칼럼, 강의 등 신뢰 자료 링크를 정리합니다."
                items={group.resources}
                onChange={(list) => handleAgeGroupList(index, 'resources', list)}
                addLabel="자료 추가"
                itemPlaceholder="예: 보건복지부 영유아 건강검진 안내 (https://...)"
              />
            </div>
          ))}
        </div>
      </div>

      <SimpleListEditor
        title="긴급/상담 연락처"
        description="소아과 야간 진료, 부모 상담센터 등 긴급 시 참고할 연락처를 정리합니다. (URL/전화번호 입력 가능)"
        items={safeGuide.emergencyContacts}
        onChange={handleEmergencyContactsChange}
        addLabel="연락처 추가"
        itemPlaceholder="예: 129(보건복지상담센터), 1339(질병관리청), 지역 보건소 번호"
      />
    </section>
  );
}

ParentingThemeEditor.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    ageGroups: PropTypes.arrayOf(
      PropTypes.shape({
        ageRange: PropTypes.string,
        focusSummary: PropTypes.string,
        developmentFocus: PropTypes.arrayOf(PropTypes.string),
        careTips: PropTypes.arrayOf(PropTypes.string),
        resources: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    generalTips: PropTypes.arrayOf(PropTypes.string),
    emergencyContacts: PropTypes.arrayOf(PropTypes.string)
  }),
  onChange: PropTypes.func.isRequired
};

ParentingThemeEditor.defaultProps = { guide: null };

export default ParentingThemeEditor;
