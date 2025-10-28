// frontend/src/pages/IssuePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import InfoBlock from '../components/InfoBlock.jsx';
import IntensityBar from '../components/IntensityBar.jsx';
import MetaTags from '../components/MetaTags.jsx';
import { API_BASE_URL } from '../config.js';

const EMPTY_ISSUE = {
  id: '',
  title: '',
  date: '',
  category: '기타',
  summary: '',
  summaryFacts: [],
  progressiveFrame: {
    headline: '',
    points: [],
    note: '',
    intensity: undefined
  },
  conservativeFrame: {
    headline: '',
    points: [],
    note: '',
    intensity: undefined
  },
  impactToLife: {
    text: '',
    points: []
  },
  sources: []
};

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function clampIntensity(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizeFrame(frame = {}) {
  if (Array.isArray(frame)) {
    return {
      headline: '',
      points: ensureArray(frame),
      note: '',
      intensity: undefined
    };
  }

  return {
    headline: frame.headline ?? '',
    points: ensureArray(frame.points ?? frame.items ?? []),
    note: frame.note ?? '',
    intensity: clampIntensity(frame.intensity)
  };
}

function normalizeImpact(value = {}) {
  if (typeof value === 'string') {
    return { text: value, points: [] };
  }

  return {
    text: value.text ?? '',
    points: ensureArray(value.points ?? value.list ?? [])
  };
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source, index) => ({
      id: `${source?.channelName || 'source'}-${index}`,
      type: source?.type || '기타',
      channelName: source?.channelName || '제목 미기재',
      videoDate: source?.videoDate || '',
      timestamp: source?.timestamp || '',
      note: source?.note || ''
    }))
    .filter((item) => item.channelName);
}

function IssuePage() {
  const { id } = useParams();
  const [issue, setIssue] = useState(EMPTY_ISSUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!id) {
      setError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchIssueDetail() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('이슈 상세 정보를 불러오지 못했습니다.');
        }

        const data = await response.json();
        setIssue({
          id: data.id ?? id,
          title: data.title ?? '',
          date: data.date ?? '',
          category: data.category ?? '기타',
          summary: data.summary ?? '',
          summaryFacts: ensureArray(data.summaryFacts),
          progressiveFrame: normalizeFrame(data.progressiveFrame),
          conservativeFrame: normalizeFrame(data.conservativeFrame),
          impactToLife: normalizeImpact(data.impactToLife),
          sources: normalizeSources(data.sources)
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchIssueDetail();

    return () => {
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToastMessage('');
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [toastMessage]);

  const hasData = useMemo(() => {
    return (
      issue.title ||
      issue.date ||
      issue.summary ||
      issue.summaryFacts.length ||
      issue.progressiveFrame.points.length ||
      issue.conservativeFrame.points.length ||
      issue.impactToLife.text ||
      issue.impactToLife.points.length ||
      issue.sources.length
    );
  }, [issue]);

  const handleShare = async () => {
    try {
      if (!navigator?.clipboard) {
        throw new Error('클립보드 API를 사용할 수 없습니다.');
      }
      const shareUrl = currentUrl || window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('링크 복사됨');
    } catch (shareError) {
      console.error('공유 링크 복사 실패:', shareError);
      setToastMessage('링크 복사에 실패했습니다.');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-500">{error}</p>;
  }

  if (!hasData) {
    return <p className="text-sm text-slate-500 dark:text-slate-300">표시할 상세 정보가 없습니다.</p>;
  }

  const progressiveIntensity = issue.progressiveFrame.intensity;
  const conservativeIntensity = issue.conservativeFrame.intensity;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <article className="relative space-y-8">
      <MetaTags
        title={`${issue.title} - 사건 프레임 아카이브`}
        description={issue.summary || '사건의 주요 요약과 진보/보수 프레임 비교를 제공합니다.'}
        url={currentUrl}
      />

      {toastMessage && (
        <div className="pointer-events-none fixed right-6 top-20 z-[60] inline-flex rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-slate-700/90">
          {toastMessage}
        </div>
      )}

      <header className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
          {issue.date && (
            <span className="font-medium uppercase tracking-wide">{issue.date}</span>
          )}
          {issue.category && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
              {issue.category}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{issue.title}</h1>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
          >
            <span aria-hidden="true">🔗</span> 공유하기
          </button>
        </div>
        {issue.summary && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issue.summary}</p>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoBlock
          title="확실한 사실"
          badgeType="fact"
          body={issue.summaryFacts}
          note="확정된 사실만을 요약한 영역입니다."
        />
        <InfoBlock
          title="진보 프레임"
          badgeType="left"
          headline={issue.progressiveFrame.headline}
          body={issue.progressiveFrame.points}
          note={
            issue.progressiveFrame.note ||
            '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
          }
        >
          {progressiveIntensity !== undefined && (
            <IntensityBar value={progressiveIntensity} label="프레임 강도" color="indigo" />
          )}
        </InfoBlock>
        <InfoBlock
          title="보수 프레임"
          badgeType="right"
          headline={issue.conservativeFrame.headline}
          body={issue.conservativeFrame.points}
          note={
            issue.conservativeFrame.note ||
            '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
          }
        >
          {conservativeIntensity !== undefined && (
            <IntensityBar value={conservativeIntensity} label="프레임 강도" color="rose" />
          )}
        </InfoBlock>
        <InfoBlock
          title="이게 내 삶에 뭐가 변함?"
          badgeType="impact"
          body={{ text: issue.impactToLife.text, points: issue.impactToLife.points }}
          note="ChatGPT가 생활/시장 영향 관점에서 정리한 의견입니다."
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">출처</h2>
        {issue.sources.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">등록된 출처가 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {issue.sources.map((source) => {
              const isYoutube = source.type?.toLowerCase() === 'youtube';
              const isOfficial = source.type?.toLowerCase() === 'official';

              return (
                <li
                  key={source.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {isYoutube && (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/40">
                        ▶︎ YouTube
                      </span>
                    )}
                    {isOfficial && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/40">
                        공식자료
                      </span>
                    )}
                    {!isYoutube && !isOfficial && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {source.type}
                      </span>
                    )}
                    {source.videoDate && <span>{source.videoDate}</span>}
                    {source.timestamp && <span>{source.timestamp}</span>}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{source.channelName}</p>
                  {source.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{source.note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}

export default IssuePage;
