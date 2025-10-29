// frontend/src/pages/IssuePage.jsx
// Firestore에서 직접 단일 이슈를 읽어와 상세 페이지를 렌더링한다.
// TODO: 조회수(metrics)는 현재 비활성 상태이며, 추후 Cloud Functions 등으로 처리할 수 있다.

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

const EMPTY_ISSUE = {
  id: '',
  easySummary: '',
  title: '',
  date: '',
  category: '기타',
  summaryCard: '',
  background: '',
  keyPoints: [],
  progressiveView: null,
  conservativeView: null,
  impactToLife: null,
  sources: [],
};

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIntensity(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizeView(view, fallbackNote) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  const headline = view.headline ? String(view.headline).trim() : '';
  const bullets = ensureArray(view.bullets ?? view.points);
  const note = view.note ? String(view.note).trim() : fallbackNote;
  const intensity = normalizeIntensity(view.intensity ?? view.progressiveIntensity ?? view.conservativeIntensity);

  if (!headline && bullets.length === 0) {
    return null;
  }

  const normalized = { headline, bullets, note };
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }
  return normalized;
}

function normalizeImpact(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }

  const text = impact.text ? String(impact.text).trim() : '';
  const note = impact.note ? String(impact.note).trim() : IMPACT_NOTE;

  if (!text) {
    return null;
  }

  return { text, note };
}

function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources
    .map((source, index) => ({
      id: `${source?.channelName || 'source'}-${index}`,
      type: source?.type ? String(source.type) : 'etc',
      channelName: source?.channelName ? String(source.channelName) : '',
      sourceDate: source?.sourceDate ? String(source.sourceDate) : '',
      timestamp: source?.timestamp ? String(source.timestamp) : '',
      note: source?.note ? String(source.note) : '',
    }))
    .filter((item) => item.channelName);
}

function splitParagraphs(text) {
  if (!text) {
    return [];
  }
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function IssuePage() {
  const { id } = useParams();
  const [issue, setIssue] = useState(EMPTY_ISSUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadIssue = async () => {
      setIsLoading(true);
      setError('');
      try {
        const doc = await getIssueById(id);
        if (!doc) {
          throw new Error('문서를 찾을 수 없습니다.');
        }
        if (!isMounted) return;
        setIssue({
          ...EMPTY_ISSUE,
          ...doc,
          keyPoints: ensureArray(doc.keyPoints),
          progressiveView: normalizeView(doc.progressiveView, PROGRESSIVE_NOTE),
          conservativeView: normalizeView(doc.conservativeView, CONSERVATIVE_NOTE),
          impactToLife: normalizeImpact(doc.impactToLife),
          sources: normalizeSources(doc.sources),
        });
      } catch (err) {
        console.error('이슈 불러오기 실패:', err);
        if (!isMounted) return;
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadIssue();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const backgroundParagraphs = useMemo(() => splitParagraphs(issue.background), [issue.background]);
  const hasViews = Boolean(issue.progressiveView || issue.conservativeView);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-300">문서를 불러오는 중입니다...</p>;
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
        <p>문서를 읽어오지 못했습니다.</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      <MetaTags title={`${issue.title} - 사건 프레임 아카이브`} description={issue.summaryCard} url={pageUrl} />

      <header className="space-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
          <span className="font-semibold text-indigo-600 dark:text-indigo-300">{issue.category}</span>
          <span className="text-slate-600 dark:text-slate-200">{issue.date || '정보 부족'}</span>
        </div>
        <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">{issue.title || '제목 없음'}</h1>
        {issue.summaryCard ? (
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{issue.summaryCard}</p>
        ) : null}
      </header>

      {issue.easySummary && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
          <h2 className="text-sm font-semibold uppercase tracking-wide">한 줄로 말하면?</h2>
          <p className="mt-2 text-base leading-relaxed">{issue.easySummary}</p>
        </section>
      )}

      <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
        {backgroundParagraphs.length > 0 ? (
          backgroundParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p className="italic text-slate-500 dark:text-slate-400">배경 정보가 아직 입력되지 않았습니다.</p>
        )}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">핵심 쟁점 요약</h3>
          {issue.keyPoints.length > 0 ? (
            <ul className="mt-2 space-y-1 list-disc pl-5">
              {issue.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">요약 bullet이 아직 없습니다.</p>
          )}
        </div>
      </SectionCard>

      {hasViews && (
        <section className="space-y-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">주요 시각들</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              아래 내용은 일부 진영의 주장과 전망을 정리한 것으로, 사실 여부가 확정되지 않은 의견일 수 있습니다.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {issue.progressiveView && (
              <SectionCard title={issue.progressiveView.headline || '진보 시각'} tone="progressive">
                {issue.progressiveView.bullets.length > 0 ? (
                  <ul className="space-y-1 list-disc pl-5">
                    {issue.progressiveView.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {issue.progressiveView.intensity !== undefined && (
                  <IntensityBar value={issue.progressiveView.intensity} colorClass="bg-emerald-500" />
                )}
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">{issue.progressiveView.note || PROGRESSIVE_NOTE}</p>
              </SectionCard>
            )}
            {issue.conservativeView && (
              <SectionCard title={issue.conservativeView.headline || '보수 시각'} tone="conservative">
                {issue.conservativeView.bullets.length > 0 ? (
                  <ul className="space-y-1 list-disc pl-5">
                    {issue.conservativeView.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {issue.conservativeView.intensity !== undefined && (
                  <IntensityBar value={issue.conservativeView.intensity} colorClass="bg-rose-500" />
                )}
                <p className="text-xs text-rose-900/80 dark:text-rose-200/80">{issue.conservativeView.note || CONSERVATIVE_NOTE}</p>
              </SectionCard>
            )}
          </div>
        </section>
      )}

      {issue.impactToLife && (
        <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
          <p>{issue.impactToLife.text}</p>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80">{issue.impactToLife.note || IMPACT_NOTE}</p>
        </SectionCard>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">출처</h2>
        {issue.sources.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            등록된 출처가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">채널/기관</th>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">타임스탬프</th>
                  <th className="px-4 py-3">요약</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {issue.sources.map((source) => (
                  <tr key={source.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {source.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{source.channelName}</td>
                    <td className="px-4 py-3 tabular-nums">{source.sourceDate || '-'}</td>
                    <td className="px-4 py-3 tabular-nums">{source.timestamp || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{source.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}

export default IssuePage;
