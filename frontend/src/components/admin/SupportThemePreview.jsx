// frontend/src/components/admin/SupportThemePreview.jsx
// 정부지원정보 테마 전용 미리보기 카드 (violet 톤 + 텍스트 내 URL 자동 링크).

import PropTypes from 'prop-types';
import SectionCard from '../SectionCard.jsx';

function filterList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

// 텍스트 안의 URL을 자동으로 <a>로 바꿔 렌더링
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

function SupportThemePreview({ guide }) {
  if (!guide) return null;

  const commonResources = filterList(guide.commonResources);

  return (
    <div className="space-y-5">
      {guide.overview ? (
        <SectionCard title="정부지원정보 개요" tone="neutral">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <TextWithLinks text={guide.overview} />
          </p>
        </SectionCard>
      ) : null}

      {Array.isArray(guide.programs)
        ? guide.programs
            .filter((program) => {
              const name = typeof program?.name === 'string' ? program.name.trim() : '';
              const summary = typeof program?.summary === 'string' ? program.summary.trim() : '';
              const hasDetails =
                filterList(program?.eligibility).length > 0 ||
                filterList(program?.benefits).length > 0 ||
                filterList(program?.requiredDocs).length > 0 ||
                filterList(program?.applicationProcess).length > 0;
              return name.length > 0 || summary.length > 0 || hasDetails;
            })
            .map((program, index) => {
              const eligibility = filterList(program?.eligibility);
              const benefits = filterList(program?.benefits);
              const docs = filterList(program?.requiredDocs);
              const process = filterList(program?.applicationProcess);

              return (
                <SectionCard
                  key={`preview-support-${index}`}
                  title={program?.name || `지원 프로그램 ${index + 1}`}
                  tone="neutral"
                  badgeText="지원"
                >
                  <div className="space-y-3">
                    {program?.summary ? (
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        <TextWithLinks text={program.summary} />
                      </p>
                    ) : null}

                    {eligibility.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">지원 대상</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {eligibility.map((item, itemIndex) => (
                            <li key={`eligibility-${index}-${itemIndex}`}>
                              <TextWithLinks text={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {benefits.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">지원 내용</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {benefits.map((item, itemIndex) => (
                            <li key={`benefits-${index}-${itemIndex}`}>
                              <TextWithLinks text={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {docs.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">필요 서류</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {docs.map((item, itemIndex) => (
                            <li key={`docs-${index}-${itemIndex}`}>
                              <TextWithLinks text={item} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {process.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">신청 방법</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {process.map((item, itemIndex) => (
                            <li key={`process-${index}-${itemIndex}`}>
                              <TextWithLinks text={item} />
                            </li>
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
        <SectionCard title="공통 참고자료" tone="neutral" badgeText="참고">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {commonResources.map((resource, index) => (
              <li key={`support-resource-${index}`}>
                <TextWithLinks text={resource} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

SupportThemePreview.propTypes = {
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

SupportThemePreview.defaultProps = { guide: null };

export default SupportThemePreview;
