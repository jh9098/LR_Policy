// frontend/src/components/issue/SupportGuideView.jsx
// 공개 이슈 페이지에서 정부지원정보 테마 전용 가이드를 렌더링한다.

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

function SupportGuideView({ guide }) {
  if (!guide) {
    return null;
  }

  const commonResources = normalizeList(guide.commonResources);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="정부지원정보 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{guide.overview}</p>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.programs)
        ? guide.programs
            .filter((program) => {
              const summary = typeof program?.summary === 'string' ? program.summary.trim() : '';
              const hasDetails =
                normalizeList(program?.eligibility).length > 0 ||
                normalizeList(program?.benefits).length > 0 ||
                normalizeList(program?.requiredDocs).length > 0 ||
                normalizeList(program?.applicationProcess).length > 0;
              return (
                (typeof program?.name === 'string' && program.name.trim().length > 0) || summary.length > 0 || hasDetails
              );
            })
            .map((program, index) => {
              const eligibility = normalizeList(program?.eligibility);
              const benefits = normalizeList(program?.benefits);
              const docs = normalizeList(program?.requiredDocs);
              const process = normalizeList(program?.applicationProcess);

              return (
                <SectionCard
                  key={`support-program-${index}`}
                  title={program?.name || `지원 프로그램 ${index + 1}`}
                  tone="neutral"
                  badgeText="지원"
                >
                  <div className="space-y-3">
                    {program?.summary ? (
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{program.summary}</p>
                    ) : null}
                    {eligibility.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">지원 대상</p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {eligibility.map((item, itemIndex) => (
                            <li key={`support-eligibility-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {benefits.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">지원 내용</p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {benefits.map((item, itemIndex) => (
                            <li key={`support-benefits-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {docs.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">필요 서류</p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {docs.map((item, itemIndex) => (
                            <li key={`support-docs-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {process.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">신청 방법</p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {process.map((item, itemIndex) => (
                            <li key={`support-process-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>
              );
            })
        : null}

      {commonResources.length > 0 ? (
        <SectionCard title="공통 참고자료" tone="impact" badgeText="참고">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {commonResources.map((resource, index) => (
              <li key={`support-common-resource-${index}`}>{resource}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

SupportGuideView.propTypes = {
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
  })
};

SupportGuideView.defaultProps = {
  guide: null
};

export default SupportGuideView;