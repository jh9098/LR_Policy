// frontend/src/components/admin/SupportThemeEditor.jsx
// 정부지원정보 테마 전용 입력 UI (violet 톤 + 리스트 에디터 tone 지정 + 가이드 보강).

import PropTypes from 'prop-types';
import {
  cloneSupportGuide,
  createSupportGuide,
  createSupportProgram
} from '../../utils/themeDraftDefaults.js';
import SimpleListEditor from './SimpleListEditor.jsx';

function SupportThemeEditor({ guide, onChange }) {
  const safeGuide = guide ?? createSupportGuide({ withPresets: true });

  const updateGuide = (updater) => {
    const draft = cloneSupportGuide(safeGuide);
    updater(draft);
    onChange(draft);
  };

  const handleOverviewChange = (event) => {
    updateGuide((draft) => {
      draft.overview = event.target.value;
    });
  };

  const handleCommonResourcesChange = (list) => {
    updateGuide((draft) => {
      draft.commonResources = list;
    });
  };

  const addProgram = () => {
    updateGuide((draft) => {
      draft.programs.push(createSupportProgram('새 지원 프로그램'));
    });
  };

  const removeProgram = (index) => {
    updateGuide((draft) => {
      draft.programs.splice(index, 1);
    });
  };

  const handleProgramField = (index, field, value) => {
    updateGuide((draft) => {
      if (!draft.programs[index]) draft.programs[index] = createSupportProgram();
      draft.programs[index] = { ...draft.programs[index], [field]: value };
    });
  };

  const handleProgramList = (index, field, list) => {
    updateGuide((draft) => {
      if (!draft.programs[index]) draft.programs[index] = createSupportProgram();
      draft.programs[index] = { ...draft.programs[index], [field]: list };
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-500/40 dark:bg-slate-900/40">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-violet-700 dark:text-violet-200">정부지원정보 · 프로그램별 구성</h2>
        <p className="text-xs text-violet-600/80 dark:text-violet-200/80">
          지원 대상/혜택/서류/절차를 한눈에 비교할 수 있도록 JSON으로 관리합니다. (미리보기에서 URL은 자동 링크 처리)
        </p>
      </header>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">테마 개요</span>
        <textarea
          value={safeGuide.overview}
          onChange={handleOverviewChange}
          className="min-h-[120px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/40 dark:bg-slate-900 dark:text-slate-100"
          placeholder="정부24/복지로/지자체 포털 등 주요 경로와 안내 방식을 요약하세요. (URL 입력 가능)"
        />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-200">지원 프로그램별 세부 정보</h3>
          <button
            type="button"
            onClick={addProgram}
            className="inline-flex items-center rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            프로그램 추가
          </button>
        </div>

        {safeGuide.programs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-violet-300 px-4 py-4 text-center text-xs text-violet-600 dark:border-violet-500/50 dark:text-violet-200">
            주요 지원 프로그램을 추가해 주세요.
          </p>
        ) : null}

        <div className="space-y-6">
          {safeGuide.programs.map((program, index) => (
            <div
              key={`support-program-${index}`}
              className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-500/40 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex flex-1 flex-col gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-violet-700 dark:text-violet-200">프로그램 이름</span>
                  <input
                    type="text"
                    value={program.name}
                    onChange={(e) => handleProgramField(index, 'name', e.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 청년월세 한시 특별지원"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeProgram(index)}
                  className="inline-flex items-center rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/60 dark:hover:bg-violet-500/10"
                >
                  프로그램 삭제
                </button>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">한눈에 보는 요약</span>
                <textarea
                  value={program.summary}
                  onChange={(e) => handleProgramField(index, 'summary', e.target.value)}
                  className="min-h-[100px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-500/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="누가, 무엇을, 얼마나 받을 수 있는지 핵심 요약 (URL 입력 가능)"
                />
              </label>

              <SimpleListEditor
                tone="violet"
                title="지원 대상 (자격)"
                description="소득·연령·거주지 등 구체적인 자격 요건"
                items={program.eligibility}
                onChange={(list) => handleProgramList(index, 'eligibility', list)}
                addLabel="자격 조건 추가"
                itemPlaceholder="예: 만 19~34세, 부모와 별도 거주, 무주택, 기준 중위소득 100% 이하"
              />

              <SimpleListEditor
                tone="violet"
                title="지원 내용 (혜택)"
                description="지원 금액·기간·현물/서비스 내용"
                items={program.benefits}
                onChange={(list) => handleProgramList(index, 'benefits', list)}
                addLabel="혜택 추가"
                itemPlaceholder="예: 월 최대 20만원, 12개월간 / 전기요금 30% 감면"
              />

              <SimpleListEditor
                tone="violet"
                title="필요 서류"
                description="신청 시 제출해야 하는 서류 목록"
                items={program.requiredDocs}
                onChange={(list) => handleProgramList(index, 'requiredDocs', list)}
                addLabel="서류 추가"
                itemPlaceholder="예: 임대차계약서, 주민등록등본, 재학증명서/근로소득원천징수영수증"
              />

              <SimpleListEditor
                tone="violet"
                title="신청 방법/절차"
                description="온라인/오프라인 신청 경로와 단계"
                items={program.applicationProcess}
                onChange={(list) => handleProgramList(index, 'applicationProcess', list)}
                addLabel="절차 추가"
                itemPlaceholder="예: 복지로 앱 접속 → 본인인증 → 대상자 확인 → 증빙서류 업로드 → 접수"
              />
            </div>
          ))}
        </div>
      </div>

      <SimpleListEditor
        tone="violet"
        title="공통 참고자료"
        description="복지로·정부24·지자체 포털, 문의전화 등 공통 자료 (URL 가능)"
        items={safeGuide.commonResources}
        onChange={handleCommonResourcesChange}
        addLabel="자료 추가"
        itemPlaceholder="예: 복지로 https://www.bokjiro.go.kr / 정부24 https://www.gov.kr / 보건복지상담센터 129"
      />
    </section>
  );
}

SupportThemeEditor.propTypes = {
  guide: PropTypes.shape({
    overview: PropTypes.string,
    programs: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        summary: PropTypes.string,
        eligibility: PropTypes.arrayOf(PropTypes.string),
        benefits: PropTypes.arrayOf(PropTypes.string),
        requiredDocs: PropTypes.arrayOf(PropTypes.string),
        applicationProcess: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    commonResources: PropTypes.arrayOf(PropTypes.string)
  }),
  onChange: PropTypes.func.isRequired
};

SupportThemeEditor.defaultProps = { guide: null };

export default SupportThemeEditor;
