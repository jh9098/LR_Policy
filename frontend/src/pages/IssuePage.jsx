// frontend/src/pages/IssuePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import IntensityBar from '../components/IntensityBar.jsx';
import MetaTags from '../components/MetaTags.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { API_BASE_URL } from '../config.js';

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

const EMPTY_ISSUE = {
  id: '',
  title: '',
  date: '',
  category: '기타',
  summaryCard: '',
  background: '',
  keyPoints: [],
  progressiveView: null,
  conservativeView: null,
  impactToLife: null,
  sources: []
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
      note: source?.note ? String(source.note) : ''
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
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!id) {
      setError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchIssue() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/issues/${id}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(response.status === 404 ? '해당 이슈를 찾을 수 없습니다.' : '이슈를 불러오지 못했습니다.');
        }

        const data = await response.json();
        const normalizedIssue = {
          id: data.id ?? id,
          title: data.title ?? '',
          date: data.date ?? '',
          category: data.category ?? '기타',
          summaryCard: data.summaryCard ?? '',
          background: data.background ?? '',
          keyPoints: ensureArray(data.keyPoints),
          progressiveView: normalizeView(
            data.progressiveView
              ? {
                  ...data.progressiveView,
                  intensity:
                    data.progressiveView.intensity !== undefined
                      ? data.progressiveView.intensity
                      : data.progressiveIntensity
                }
              : null,
            PROGRESSIVE_NOTE
          ),
          conservativeView: normalizeView(
            data.conservativeView
              ? {
                  ...data.conservativeView,
                  intensity:
                    data.conservativeView.intensity !== undefined
                      ? data.conservativeView.intensity
                      : data.conservativeIntensity
                }
              : null,
            CONSERVATIVE_NOTE
          ),
          impactToLife: normalizeImpact(data.impactToLife),
          sources: normalizeSources(data.sources),
          updatedAt: data.updatedAt ?? null
        };
        setIssue(normalizedIssue);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('이슈 상세 조회 실패:', err);
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchIssue();

    return () => {
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!toastMessage || typeof window === 'undefined') {
      return undefined;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const backgroundParagraphs = useMemo(() => splitParagraphs(issue.background), [issue.background]);
  const hasViews = Boolean(issue.progressiveView || issue.conservativeView);

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setToastMessage('링크가 복사되었습니다.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
      setToastMessage('링크 복사에 실패했습니다. 주소를 직접 복사해주세요.');
    }
  };

  if (isLoading) {
    return (
      <article className="space-y-6">
        <p className="text-sm text-slate-500 dark:text-slate-300">이슈 정보를 불러오는 중입니다...</p>
      </article>
    );
  }

  if (error) {
    return (
      <article className="space-y-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      </article>
    );
  }

  return (
    <article className="space-y-10">
      <MetaTags title={issue.title} description={issue.summaryCard} url={pageUrl} />

      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            {issue.date && <span className="font-semibold uppercase tracking-wide">{issue.date}</span>}
            {issue.category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
                {issue.category}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
          >
            <span aria-hidden="true">🔗</span> 링크 복사
          </button>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">{issue.title}</h1>
        {issue.summaryCard && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issue.summaryCard}</p>
        )}
        {toastMessage && (
          <p className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {toastMessage}
          </p>
        )}
      </header>

      <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
        {backgroundParagraphs.length > 0 ? (
          backgroundParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))
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
