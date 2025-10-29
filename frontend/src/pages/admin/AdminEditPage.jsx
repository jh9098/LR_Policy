// frontend/src/pages/admin/AdminEditPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { API_BASE_URL, ADMIN_SECRET } from '../../config.js';

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
  const intensity = normalizeIntensity(view.intensity);

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

function AdminEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(EMPTY_ISSUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        const response = await fetch(`${API_BASE_URL}/issues/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? '해당 문서를 찾을 수 없습니다.' : '문서를 불러오지 못했습니다.');
        }
        const data = await response.json();
        if (!isMounted) {
          return;
        }
        const normalizedIssue = {
          id: data.id ?? id,
          title: data.title ?? '',
          date: data.date ?? '',
          category: data.category ?? '기타',
          summaryCard: data.summaryCard ?? '',
          background: data.background ?? '',
          keyPoints: ensureArray(data.keyPoints),
          progressiveView: normalizeView(data.progressiveView, PROGRESSIVE_NOTE),
          conservativeView: normalizeView(data.conservativeView, CONSERVATIVE_NOTE),
          impactToLife: normalizeImpact(data.impactToLife),
          sources: normalizeSources(data.sources)
        };
        setIssue(normalizedIssue);
      } catch (err) {
        console.error('문서 불러오기 실패:', err);
        if (!isMounted) {
          return;
        }
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
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

  const handleDelete = async () => {
    if (!id) {
      return;
    }
    const ok = window.confirm('정말로 이 문서를 삭제할까요? 삭제 후에는 복원할 수 없습니다.');
    if (!ok) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        }
      });
      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }
      alert('삭제 완료');
      navigate('/admin/list');
    } catch (err) {
      console.error('삭제 실패:', err);
      setError(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const backgroundParagraphs = useMemo(() => splitParagraphs(issue.background), [issue.background]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">문서 상세 / 수정 준비</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            현재 저장된 데이터를 확인하고 향후 수정 기능을 구상하는 화면입니다. 아직 PUT API 연동은 준비 중입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/list"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
          >
            목록으로
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-900"
          >
            삭제
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-100/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
          <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{issue.category}</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{issue.title}</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{issue.date}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{issue.summaryCard}</p>
            </section>

            <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
              {backgroundParagraphs.length > 0 ? (
                backgroundParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p className="text-slate-500">배경 설명이 비어 있습니다.</p>
              )}
            </SectionCard>

            <SectionCard title="핵심 쟁점 요약" tone="neutral">
              {issue.keyPoints.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5">
                  {issue.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">핵심 bullet이 없습니다.</p>
              )}
            </SectionCard>

            {issue.progressiveView ? (
              <SectionCard title="주요 시각들 - 진보" tone="progressive">
                {issue.progressiveView.headline ? <p className="font-semibold">{issue.progressiveView.headline}</p> : null}
                {issue.progressiveView.bullets?.length ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {issue.progressiveView.bullets.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-emerald-700 dark:text-emerald-200">{issue.progressiveView.note}</p>
                {issue.progressiveView.intensity !== undefined ? (
                  <IntensityBar value={issue.progressiveView.intensity} label="주장 강도" colorClass="bg-emerald-500" />
                ) : null}
              </SectionCard>
            ) : null}

            {issue.conservativeView ? (
              <SectionCard title="주요 시각들 - 보수" tone="conservative">
                {issue.conservativeView.headline ? <p className="font-semibold">{issue.conservativeView.headline}</p> : null}
                {issue.conservativeView.bullets?.length ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {issue.conservativeView.bullets.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-rose-700 dark:text-rose-200">{issue.conservativeView.note}</p>
                {issue.conservativeView.intensity !== undefined ? (
                  <IntensityBar value={issue.conservativeView.intensity} label="주장 강도" colorClass="bg-rose-500" />
                ) : null}
              </SectionCard>
            ) : null}

            {issue.impactToLife ? (
              <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
                <p>{issue.impactToLife.text}</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-200">{issue.impactToLife.note}</p>
              </SectionCard>
            ) : null}

            <SectionCard title="출처" tone="neutral">
              {issue.sources.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {issue.sources.map((source) => (
                    <div key={source.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                      <p className="font-semibold text-slate-700 dark:text-slate-100">{source.channelName}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <span>유형: {source.type}</span>
                        {source.sourceDate ? <span>날짜: {source.sourceDate}</span> : null}
                        {source.timestamp ? <span>시각: {source.timestamp}</span> : null}
                      </div>
                      {source.note ? <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">{source.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">등록된 출처가 없습니다.</p>
              )}
            </SectionCard>
          </article>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">수정 계획</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              아직은 수정 폼을 제공하지 않지만, 아래 TODO 주석을 참고해 추후 업데이트 기능을 구현할 예정입니다.
            </p>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
              <p className="font-semibold">TODO: PUT /api/issues/:id 요청 구조</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
{`{
  "title": "...",
  "date": "YYYY-MM-DD",
  "category": "부동산",
  "summaryCard": "...",
  "background": "...",
  "keyPoints": ["..."],
  "progressiveView": { "headline": "...", "bullets": ["..."], "note": "...", "intensity": 70 },
  "conservativeView": { "headline": "...", "bullets": ["..."], "note": "...", "intensity": 40 },
  "impactToLife": { "text": "...", "note": "..." },
  "sources": [ { "type": "official", "channelName": "...", "sourceDate": "...", "timestamp": "...", "note": "..." } ]
}`}
              </pre>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                위 형식으로 PUT 요청을 보내 Firestore 문서를 덮어쓸 예정입니다. {/* TODO: 실제 업데이트 시 인증과 유효성 검증을 강화해야 한다. */}
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default AdminEditPage;
