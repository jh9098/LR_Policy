// frontend/src/pages/IssuePage.jsx
// Firestore Web SDK로 직접 개별 이슈를 불러와 상세 페이지를 렌더링한다.
// TODO: 조회수(metrics) 누적은 현재 비활성 상태이며, Cloud Functions 등 별도 경로에서 처리해야 한다.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import IntensityBar from '../components/IntensityBar.jsx';
import MetaTags from '../components/MetaTags.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { getIssueById } from '../firebaseClient.js';

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  return String(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function IssuePage() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!id) {
      setError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadIssue() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getIssueById(id);
        if (!data) {
          throw new Error('해당 이슈를 찾을 수 없습니다.');
        }
        if (!isMounted) {
          return;
        }
        setIssue(data);
      } catch (err) {
        console.error('Firestore에서 이슈 상세 불러오기 실패:', err);
        if (isMounted) {
          setError(err.message || '이슈 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadIssue();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToastMessage(''), 2000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const metaTitle = issue ? `${issue.title} - 사건 프레임 아카이브` : '사건 프레임 아카이브';
  const metaDescription = issue?.easySummary || issue?.summaryCard || '정책/사건의 맥락을 정리합니다.';
  const easySummary = issue?.easySummary || '';
  const keyPoints = useMemo(() => toArray(issue?.keyPoints), [issue?.keyPoints]);
  const backgroundParagraphs = useMemo(() => toArray(issue?.background), [issue?.background]);
  const progressiveView = issue?.progressiveView
    ? {
        ...issue.progressiveView,
        bullets: toArray(issue.progressiveView.bullets),
        note: issue.progressiveView.note || PROGRESSIVE_NOTE
      }
    : null;
  const conservativeView = issue?.conservativeView
    ? {
        ...issue.conservativeView,
        bullets: toArray(issue.conservativeView.bullets),
        note: issue.conservativeView.note || CONSERVATIVE_NOTE
      }
    : null;
  const impactToLife = issue?.impactToLife
    ? { ...issue.impactToLife, note: issue.impactToLife.note || IMPACT_NOTE }
    : null;

  const handleCopyLink = async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage('링크가 복사되었습니다.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
      setToastMessage('복사에 실패했습니다. 주소 표시줄에서 직접 복사해주세요.');
    }
  };

  return (
    <section className="space-y-8">
      <MetaTags title={metaTitle} description={metaDescription} url={pageUrl} />

      {toastMessage && (
        <div className="fixed inset-x-0 top-20 z-50 mx-auto w-full max-w-sm rounded-lg border border-indigo-200 bg-white px-4 py-3 text-center text-sm text-indigo-700 shadow-lg dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-200">
          {toastMessage}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      {!isLoading && !error && issue && (
        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300">
              <span className="font-semibold uppercase tracking-wide">{issue.date || '정보 부족'}</span>
              {issue.category ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
                  {issue.category}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-snug text-slate-900 dark:text-slate-100">{issue.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issue.summaryCard}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
              >
                링크 복사
              </button>
              <span>문서 ID: {issue.id}</span>
            </div>
          </header>

          {easySummary && (
            <SectionCard title="쉬운 요약" tone="neutral">
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">{easySummary}</p>
            </SectionCard>
          )}

          <SectionCard title="무슨 일이 있었나요?" tone="neutral">
            {backgroundParagraphs.length > 0 ? (
              <div className="space-y-3">
                {backgroundParagraphs.map((paragraph, index) => (
                  <p key={index} className="leading-relaxed text-slate-700 dark:text-slate-200">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">배경 설명이 아직 입력되지 않았습니다.</p>
            )}
          </SectionCard>

          <SectionCard title="핵심 쟁점 정리" tone="neutral">
            {keyPoints.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">핵심 쟁점 항목이 아직 없습니다.</p>
            )}
          </SectionCard>

          {progressiveView && (
            <SectionCard title="진보 성향에서 보는 전망" tone="progressive" badgeText="진보 시각">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{progressiveView.headline}</h3>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{progressiveView.note}</p>
                </div>
                {progressiveView.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                    {progressiveView.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {typeof progressiveView.intensity === 'number' && progressiveView.intensity >= 0 ? (
                  <IntensityBar intensity={progressiveView.intensity} />
                ) : (
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/80">강도 정보가 제공되지 않았습니다.</p>
                )}
              </div>
            </SectionCard>
          )}

          {conservativeView && (
            <SectionCard title="보수 성향에서 보는 전망" tone="conservative" badgeText="보수 시각">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">{conservativeView.headline}</h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-200/80">{conservativeView.note}</p>
                </div>
                {conservativeView.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-rose-900 dark:text-rose-100">
                    {conservativeView.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {typeof conservativeView.intensity === 'number' && conservativeView.intensity >= 0 ? (
                  <IntensityBar intensity={conservativeView.intensity} />
                ) : (
                  <p className="text-xs text-rose-700/70 dark:text-rose-200/80">강도 정보가 제공되지 않았습니다.</p>
                )}
              </div>
            </SectionCard>
          )}

          {impactToLife && (
            <SectionCard title="생활에 어떤 영향이 있나요?" tone="impact" badgeText="체감 영향">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{impactToLife.text}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{impactToLife.note || IMPACT_NOTE}</p>
            </SectionCard>
          )}

          <SectionCard title="근거 자료" tone="neutral">
            {Array.isArray(issue.sources) && issue.sources.length > 0 ? (
              <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {issue.sources.map((source, index) => (
                  <li key={`${source.channelName}-${index}`} className="rounded-lg border border-slate-200 bg-white/60 p-4 dark:border-slate-600 dark:bg-slate-900/40">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{source.channelName || '출처 미상'}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{source.type || 'etc'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      날짜: {source.sourceDate || '정보 부족'} {source.timestamp ? `· ${source.timestamp}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{source.note || '설명이 없습니다.'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">등록된 출처가 없습니다.</p>
            )}
          </SectionCard>
        </div>
      )}
    </section>
  );
}

export default IssuePage;
