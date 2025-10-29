// frontend/src/pages/admin/AdminNewPage.jsx
// 관리자 신규 작성 페이지를 전면 개편해 issueDraft 스키마 단일 state로 관리하고,
// JSON 붙여넣기 · 자동 분배 · 실시간 미리보기를 지원한다.
import { useEffect, useMemo, useState } from 'react';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { API_BASE_URL } from '../../config.js';
import { emptyDraft } from '../../utils/emptyDraft.js';
import { loadDraftFromJson } from '../../utils/loadDraftFromJson.js';

const CATEGORY_OPTIONS = ['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];
const SOURCE_TYPE_OPTIONS = [
  { value: 'official', label: '공식 발표' },
  { value: 'youtube', label: '유튜브' },
  { value: 'media', label: '언론/매체' },
  { value: 'etc', label: '기타' }
];

const STORAGE_KEY = 'adminDraftV3';

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function getTodayKst() {
  const now = new Date();
  const seoulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = seoulNow.getFullYear();
  const month = String(seoulNow.getMonth() + 1).padStart(2, '0');
  const day = String(seoulNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampIntensity(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function toEditableString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function normalizeViewForState(view, defaultNote) {
  if (!view || typeof view !== 'object') {
    return undefined;
  }
  return {
    headline: toEditableString(view.headline ?? ''),
    bullets: Array.isArray(view.bullets) ? view.bullets.map((item) => toEditableString(item)) : [],
    intensity:
      view.intensity === null || view.intensity === undefined || view.intensity === ''
        ? ''
        : clampIntensity(view.intensity),
    note: typeof view.note === 'string' && view.note ? view.note : defaultNote
  };
}

function normalizeImpactForState(impact) {
  if (!impact || typeof impact !== 'object') {
    return undefined;
  }
  return {
    text: toEditableString(impact.text ?? ''),
    note: typeof impact.note === 'string' && impact.note ? impact.note : IMPACT_NOTE
  };
}

function normalizeSourcesForState(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  return sources.map((source) => ({
    type: typeof source?.type === 'string' && source.type ? source.type : 'etc',
    channelName: toEditableString(source?.channelName ?? ''),
    sourceDate: toEditableString(source?.sourceDate ?? ''),
    timestamp: toEditableString(source?.timestamp ?? ''),
    note: toEditableString(source?.note ?? '')
  }));
}

function createInitialDraft() {
  return {
    ...emptyDraft,
    date: getTodayKst()
  };
}

function normalizeDraftForState(rawDraft) {
  const base = createInitialDraft();
  if (!rawDraft || typeof rawDraft !== 'object') {
    return base;
  }

  return {
    ...base,
    title: toEditableString(rawDraft.title ?? base.title),
    date: toEditableString(rawDraft.date ?? base.date),
    category: CATEGORY_OPTIONS.includes(rawDraft.category) ? rawDraft.category : base.category,
    summaryCard: toEditableString(rawDraft.summaryCard ?? base.summaryCard),
    background: toEditableString(rawDraft.background ?? base.background),
    keyPoints: Array.isArray(rawDraft.keyPoints)
      ? rawDraft.keyPoints.map((item) => toEditableString(item))
      : [...base.keyPoints],
    progressiveView: normalizeViewForState(rawDraft.progressiveView, PROGRESSIVE_NOTE),
    conservativeView: normalizeViewForState(rawDraft.conservativeView, CONSERVATIVE_NOTE),
    impactToLife: normalizeImpactForState(rawDraft.impactToLife),
    sources: normalizeSourcesForState(rawDraft.sources)
  };
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

function sanitizeDraftForSubmit(draft) {
  const toTrimmed = (value) => (typeof value === 'string' ? value.trim() : '');
  const sanitizePerspective = (view) => {
    if (!view || typeof view !== 'object') {
      return undefined;
    }
    const headline = toTrimmed(view.headline);
    const bullets = Array.isArray(view.bullets)
      ? view.bullets.map((item) => toTrimmed(item)).filter(Boolean)
      : [];
    const note = typeof view.note === 'string' ? view.note : '';
    const intensity = view.intensity === '' ? undefined : clampIntensity(view.intensity);

    if (!headline && bullets.length === 0 && !note) {
      return undefined;
    }

    const normalized = { headline, bullets, note };
    if (intensity !== '' && intensity !== undefined) {
      normalized.intensity = Number(intensity);
    }
    return normalized;
  };

  const sanitizeImpact = (impact) => {
    if (!impact || typeof impact !== 'object') {
      return undefined;
    }
    const text = toTrimmed(impact.text);
    const note = typeof impact.note === 'string' ? impact.note : '';
    if (!text && !note) {
      return undefined;
    }
    return { text, note };
  };

  const sanitizeSources = (sources) => {
    if (!Array.isArray(sources)) {
      return [];
    }
    return sources
      .map((source) => ({
        type: typeof source.type === 'string' && source.type ? source.type : 'etc',
        channelName: toTrimmed(source.channelName),
        sourceDate: toTrimmed(source.sourceDate),
        timestamp:
          source.timestamp === null || source.timestamp === undefined || source.timestamp === ''
            ? null
            : toTrimmed(source.timestamp),
        note: typeof source.note === 'string' ? source.note : ''
      }))
      .filter((source) => source.channelName);
  };

  return {
    title: toTrimmed(draft.title),
    date: toTrimmed(draft.date),
    category: CATEGORY_OPTIONS.includes(draft.category) ? draft.category : '기타',
    summaryCard: toTrimmed(draft.summaryCard),
    background: toTrimmed(draft.background),
    keyPoints: Array.isArray(draft.keyPoints)
      ? draft.keyPoints.map((item) => toTrimmed(item)).filter(Boolean)
      : [],
    progressiveView: sanitizePerspective(draft.progressiveView),
    conservativeView: sanitizePerspective(draft.conservativeView),
    impactToLife: sanitizeImpact(draft.impactToLife),
    sources: sanitizeSources(draft.sources)
  };
}

function AdminNewPage() {
  const [draft, setDraft] = useState(() => {
    if (typeof window === 'undefined') {
      return createInitialDraft();
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return normalizeDraftForState(parsed);
      }
    } catch (error) {
      console.warn('로컬 draft 복구 실패:', error);
    }
    return createInitialDraft();
  });
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn('로컬 draft 저장 실패:', error);
    }
  }, [draft]);

  const previewDraft = useMemo(() => {
    const toTrimmed = (value) => (typeof value === 'string' ? value.trim() : '');
    const refinePerspective = (view) => {
      if (!view) {
        return undefined;
      }
      const headline = toTrimmed(view.headline);
      const bullets = Array.isArray(view.bullets)
        ? view.bullets.map((item) => toTrimmed(item)).filter(Boolean)
        : [];
      const note = typeof view.note === 'string' && view.note ? view.note : undefined;
      const intensity = view.intensity === '' ? undefined : clampIntensity(view.intensity);

      if (!headline && bullets.length === 0) {
        return undefined;
      }

      const normalized = { headline, bullets };
      if (note) {
        normalized.note = note;
      }
      if (intensity !== '' && intensity !== undefined) {
        normalized.intensity = Number(intensity);
      }
      return normalized;
    };

    const refineImpact = (impact) => {
      if (!impact) {
        return undefined;
      }
      const text = toTrimmed(impact.text);
      const note = typeof impact.note === 'string' && impact.note ? impact.note : undefined;
      if (!text) {
        return undefined;
      }
      return note ? { text, note } : { text };
    };

    const refineSources = (sources) => {
      if (!Array.isArray(sources)) {
        return [];
      }
      return sources
        .map((source, index) => ({
          id: `${source.channelName || 'source'}-${index}`,
          type: source.type || 'etc',
          channelName: toTrimmed(source.channelName),
          sourceDate: toTrimmed(source.sourceDate),
          timestamp: source.timestamp ? toTrimmed(source.timestamp) : '',
          note: toTrimmed(source.note)
        }))
        .filter((source) => source.channelName);
    };

    return {
      ...draft,
      keyPoints: Array.isArray(draft.keyPoints)
        ? draft.keyPoints.map((item) => toTrimmed(item)).filter(Boolean)
        : [],
      progressiveView: refinePerspective(draft.progressiveView),
      conservativeView: refinePerspective(draft.conservativeView),
      impactToLife: refineImpact(draft.impactToLife),
      sources: refineSources(draft.sources)
    };
  }, [draft]);

  const handleTopLevelChange = (field) => (event) => {
    const { value } = event.target;
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setDraft((prev) => ({ ...prev, category: CATEGORY_OPTIONS.includes(value) ? value : prev.category }));
  };

  const handleKeyPointChange = (index, value) => {
    setDraft((prev) => {
      const next = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      next[index] = value;
      return { ...prev, keyPoints: next };
    });
  };

  const addKeyPoint = () => {
    setDraft((prev) => ({ ...prev, keyPoints: [...(prev.keyPoints || []), ''] }));
  };

  const removeKeyPoint = (index) => {
    setDraft((prev) => {
      const next = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      next.splice(index, 1);
      return { ...prev, keyPoints: next };
    });
  };

  const ensureView = (key, defaultNote) => {
    setDraft((prev) => {
      if (prev[key]) {
        return prev;
      }
      return {
        ...prev,
        [key]: {
          headline: '',
          bullets: [''],
          intensity: '',
          note: defaultNote
        }
      };
    });
  };

  const removeView = (key) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleViewFieldChange = (key, field, value) => {
    setDraft((prev) => {
      const current = prev[key] ?? { headline: '', bullets: [], intensity: '', note: '' };
      const updated = { ...current, [field]: field === 'intensity' ? clampIntensity(value) : value };
      return { ...prev, [key]: updated };
    });
  };

  const handleViewBulletChange = (key, index, value) => {
    setDraft((prev) => {
      const current = prev[key] ?? { headline: '', bullets: [], intensity: '', note: '' };
      const bullets = Array.isArray(current.bullets) ? [...current.bullets] : [];
      bullets[index] = value;
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const addViewBullet = (key) => {
    setDraft((prev) => {
      const current = prev[key] ?? { headline: '', bullets: [], intensity: '', note: '' };
      const bullets = Array.isArray(current.bullets) ? [...current.bullets, ''] : [''];
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const removeViewBullet = (key, index) => {
    setDraft((prev) => {
      const current = prev[key];
      if (!current || !Array.isArray(current.bullets)) {
        return prev;
      }
      const bullets = [...current.bullets];
      bullets.splice(index, 1);
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const ensureImpactSection = () => {
    setDraft((prev) => {
      if (prev.impactToLife) {
        return prev;
      }
      return {
        ...prev,
        impactToLife: {
          text: '',
          note: IMPACT_NOTE
        }
      };
    });
  };

  const removeImpactSection = () => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next.impactToLife;
      return next;
    });
  };

  const handleImpactChange = (field, value) => {
    setDraft((prev) => {
      const current = prev.impactToLife ?? { text: '', note: IMPACT_NOTE };
      return { ...prev, impactToLife: { ...current, [field]: value } };
    });
  };

  const handleSourceChange = (index, field, value) => {
    setDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      sources[index] = {
        ...sources[index],
        [field]: field === 'type' ? value : value
      };
      return { ...prev, sources };
    });
  };

  const addSource = () => {
    setDraft((prev) => ({
      ...prev,
      sources: [
        ...(Array.isArray(prev.sources) ? prev.sources : []),
        {
          type: 'official',
          channelName: '',
          sourceDate: '',
          timestamp: '',
          note: ''
        }
      ]
    }));
  };

  const removeSource = (index) => {
    setDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      sources.splice(index, 1);
      return { ...prev, sources };
    });
  };

  const handleLoadJson = () => {
    try {
      const parsed = loadDraftFromJson(jsonInput);
      setDraft(normalizeDraftForState(parsed));
      setJsonError('');
    } catch (error) {
      setJsonError(error.message || 'JSON 파싱 중 알 수 없는 오류가 발생했습니다.');
    }
  };

  const resetDraftState = (preserveSuccess = false) => {
    const initial = createInitialDraft();
    setDraft(initial);
    setJsonInput('');
    setJsonError('');
    setSubmitError('');
    if (!preserveSuccess) {
      setSubmitSuccess('');
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('로컬 draft 초기화 실패:', error);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitting(true);

    try {
      const payload = sanitizeDraftForSubmit(draft);
      if (!payload.title || !payload.date || !payload.summaryCard || !payload.background) {
        throw new Error('제목, 날짜, 홈 요약, 배경은 반드시 입력해야 합니다.');
      }
      if (payload.keyPoints.length === 0) {
        throw new Error('핵심 포인트를 최소 1개 이상 입력해 주세요.');
      }
      if (payload.sources.length === 0) {
        throw new Error('출처를 최소 1개 이상 입력해 주세요.');
      }

      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '등록 중 오류가 발생했습니다.');
      }

      setSubmitSuccess('등록이 완료되었습니다.');
      resetDraftState(true);
    } catch (error) {
      console.error('등록 실패:', error);
      setSubmitError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold">새 이슈 등록</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            AI가 정리해 준 JSON을 붙여넣으면 모든 필드가 자동으로 채워지고, 필요한 부분만 다듬은 뒤 바로 등록할 수 있습니다.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">AI JSON 붙여넣기</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                운영자 프롬프트 결과를 통째로 붙여넣고 “불러오기”를 누르면 issueDraft 구조에 맞춰 자동으로 분배됩니다.
              </p>
              <textarea
                className="mt-4 h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder='{"title":"...","date":"2024-05-05", ... }'
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
              />
              {jsonError ? (
                <p className="mt-2 text-sm font-semibold text-rose-500">{jsonError}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLoadJson}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  불러오기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput('');
                    setJsonError('');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  JSON 지우기
                </button>
              </div>
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">기본 정보</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">제목</span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={handleTopLevelChange('title')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="정책/사건 제목"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">날짜</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={handleTopLevelChange('date')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">카테고리</span>
                  <select
                    value={draft.category}
                    onChange={handleCategoryChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col gap-2 text-sm md:col-span-2">
                  <span className="font-medium">홈 카드 요약</span>
                  <textarea
                    value={draft.summaryCard}
                    onChange={handleTopLevelChange('summaryCard')}
                    className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="홈 화면 카드에 들어갈 핵심 요약"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">배경/맥락</h2>
              <textarea
                value={draft.background}
                onChange={handleTopLevelChange('background')}
                className="min-h-[200px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="공식 확인된 사실 위주로 배경을 정리하세요."
              />
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">핵심 포인트</h2>
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  bullet 추가
                </button>
              </div>
              {draft.keyPoints.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  아직 bullet이 없습니다. “bullet 추가” 버튼을 눌러 핵심 문장을 입력하세요.
                </p>
              ) : null}
              <div className="space-y-3">
                {draft.keyPoints.map((point, index) => (
                  <div key={`key-point-${index}`} className="flex items-start gap-3">
                    <textarea
                      value={point}
                      onChange={(event) => handleKeyPointChange(index, event.target.value)}
                      className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={`핵심 문장 ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(index)}
                      className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">진보 시각</h2>
                {draft.progressiveView ? (
                  <button
                    type="button"
                    onClick={() => removeView('progressiveView')}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensureView('progressiveView', PROGRESSIVE_NOTE)}
                    className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>
              {draft.progressiveView ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={draft.progressiveView.headline}
                      onChange={(event) => handleViewFieldChange('progressiveView', 'headline', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="진보 진영의 주장 핵심 제목"
                    />
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">bullet</span>
                      <button
                        type="button"
                        onClick={() => addViewBullet('progressiveView')}
                        className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        bullet 추가
                      </button>
                    </div>
                    {draft.progressiveView.bullets.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        bullet을 추가해 자세한 주장 내용을 정리하세요.
                      </p>
                    ) : null}
                    {draft.progressiveView.bullets.map((bullet, index) => (
                      <div key={`progressive-bullet-${index}`} className="flex items-start gap-3">
                        <textarea
                          value={bullet}
                          onChange={(event) =>
                            handleViewBulletChange('progressiveView', index, event.target.value)
                          }
                          className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder={`bullet ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeViewBullet('progressiveView', index)}
                          className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={draft.progressiveView.intensity}
                      onChange={(event) => handleViewFieldChange('progressiveView', 'intensity', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={draft.progressiveView.note}
                      onChange={(event) => handleViewFieldChange('progressiveView', 'note', event.target.value)}
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">보수 시각</h2>
                {draft.conservativeView ? (
                  <button
                    type="button"
                    onClick={() => removeView('conservativeView')}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensureView('conservativeView', CONSERVATIVE_NOTE)}
                    className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>
              {draft.conservativeView ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={draft.conservativeView.headline}
                      onChange={(event) => handleViewFieldChange('conservativeView', 'headline', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="보수 진영의 주장 핵심 제목"
                    />
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">bullet</span>
                      <button
                        type="button"
                        onClick={() => addViewBullet('conservativeView')}
                        className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        bullet 추가
                      </button>
                    </div>
                    {draft.conservativeView.bullets.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        bullet을 추가해 자세한 주장 내용을 정리하세요.
                      </p>
                    ) : null}
                    {draft.conservativeView.bullets.map((bullet, index) => (
                      <div key={`conservative-bullet-${index}`} className="flex items-start gap-3">
                        <textarea
                          value={bullet}
                          onChange={(event) =>
                            handleViewBulletChange('conservativeView', index, event.target.value)
                          }
                          className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder={`bullet ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeViewBullet('conservativeView', index)}
                          className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={draft.conservativeView.intensity}
                      onChange={(event) => handleViewFieldChange('conservativeView', 'intensity', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={draft.conservativeView.note}
                      onChange={(event) => handleViewFieldChange('conservativeView', 'note', event.target.value)}
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">이게 내 삶에 뭐가 변함?</h2>
                {draft.impactToLife ? (
                  <button
                    type="button"
                    onClick={removeImpactSection}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={ensureImpactSection}
                    className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>
              {draft.impactToLife ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">본문</span>
                    <textarea
                      value={draft.impactToLife.text}
                      onChange={(event) => handleImpactChange('text', event.target.value)}
                      className="min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="중립적 해석과 체감 영향을 요약하세요."
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={draft.impactToLife.note}
                      onChange={(event) => handleImpactChange('note', event.target.value)}
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">출처</h2>
                <button
                  type="button"
                  onClick={addSource}
                  className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  출처 추가
                </button>
              </div>
              {draft.sources.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  아직 출처가 없습니다. 최소 1개 이상 입력해야 등록할 수 있습니다.
                </p>
              ) : null}
              <div className="space-y-6">
                {draft.sources.map((source, index) => (
                  <div
                    key={`source-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-600 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">출처 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm">
                        <span className="font-medium">유형</span>
                        <select
                          value={source.type}
                          onChange={(event) => handleSourceChange(index, 'type', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {SOURCE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span className="font-medium">채널/출처명</span>
                        <input
                          type="text"
                          value={source.channelName}
                          onChange={(event) => handleSourceChange(index, 'channelName', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span className="font-medium">기사/영상 날짜</span>
                        <input
                          type="date"
                          value={source.sourceDate}
                          onChange={(event) => handleSourceChange(index, 'sourceDate', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span className="font-medium">타임스탬프(선택)</span>
                        <input
                          type="text"
                          value={source.timestamp}
                          onChange={(event) => handleSourceChange(index, 'timestamp', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="12:30"
                        />
                      </label>
                    </div>
                    <label className="mt-4 flex flex-col gap-2 text-sm">
                      <span className="font-medium">비고</span>
                      <textarea
                        value={source.note}
                        onChange={(event) => handleSourceChange(index, 'note', event.target.value)}
                        className="min-h-[60px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm">
                {submitError ? (
                  <p className="font-semibold text-rose-500">{submitError}</p>
                ) : null}
                {submitSuccess ? (
                  <p className="font-semibold text-emerald-500">{submitSuccess}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => resetDraftState(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div>
              <h2 className="text-lg font-semibold">미리보기</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                IssuePage 스타일을 그대로 적용해 실시간으로 렌더링합니다. 실제 등록 데이터와 동일한 구조입니다.
              </p>
            </div>
            <div className="space-y-6 text-sm leading-relaxed">
              <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <span className="rounded-full border border-slate-200 px-2.5 py-0.5 dark:border-slate-600">
                    {previewDraft.category || '카테고리 미지정'}
                  </span>
                  <span>{previewDraft.date || '날짜 미입력'}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{previewDraft.title || '제목 미입력'}</h1>
                <p className="text-slate-700 dark:text-slate-200">{previewDraft.summaryCard || '홈 카드 요약을 입력하면 여기 반영됩니다.'}</p>
              </header>

              <SectionCard title="배경" tone="neutral">
                {splitParagraphs(previewDraft.background).length > 0 ? (
                  splitParagraphs(previewDraft.background).map((paragraph, index) => (
                    <p key={`bg-${index}`}>{paragraph}</p>
                  ))
                ) : (
                  <p className="text-slate-500">배경 설명을 입력하면 여기 표시됩니다.</p>
                )}
              </SectionCard>

              <SectionCard title="핵심 포인트" badgeText="정리" tone="neutral">
                {previewDraft.keyPoints.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {previewDraft.keyPoints.map((point, index) => (
                      <li key={`point-${index}`}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">핵심 bullet이 입력되면 목록으로 표시됩니다.</p>
                )}
              </SectionCard>

              {previewDraft.progressiveView ? (
                <SectionCard title="진보 시각" badgeText="관점" tone="progressive">
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                    {previewDraft.progressiveView.headline}
                  </h3>
                  {previewDraft.progressiveView.intensity !== undefined ? (
                    <IntensityBar
                      value={previewDraft.progressiveView.intensity}
                      label="주장 강도"
                      colorClass="bg-emerald-500"
                    />
                  ) : null}
                  {previewDraft.progressiveView.bullets.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {previewDraft.progressiveView.bullets.map((bullet, index) => (
                        <li key={`progressive-preview-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {previewDraft.progressiveView.note ? (
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
                      {previewDraft.progressiveView.note}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              {previewDraft.conservativeView ? (
                <SectionCard title="보수 시각" badgeText="관점" tone="conservative">
                  <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
                    {previewDraft.conservativeView.headline}
                  </h3>
                  {previewDraft.conservativeView.intensity !== undefined ? (
                    <IntensityBar
                      value={previewDraft.conservativeView.intensity}
                      label="주장 강도"
                      colorClass="bg-rose-500"
                    />
                  ) : null}
                  {previewDraft.conservativeView.bullets.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {previewDraft.conservativeView.bullets.map((bullet, index) => (
                        <li key={`conservative-preview-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {previewDraft.conservativeView.note ? (
                    <p className="text-xs text-rose-900/80 dark:text-rose-100/80">
                      {previewDraft.conservativeView.note}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              {previewDraft.impactToLife ? (
                <SectionCard title="이게 내 삶에 뭐가 변함?" badgeText="중립 해석" tone="impact">
                  <p>{previewDraft.impactToLife.text}</p>
                  {previewDraft.impactToLife.note ? (
                    <p className="text-xs text-indigo-900/80 dark:text-indigo-100/80">
                      {previewDraft.impactToLife.note}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              <SectionCard title="출처" badgeText="근거" tone="neutral">
                {previewDraft.sources.length > 0 ? (
                  <div className="space-y-4">
                    {previewDraft.sources.map((source) => (
                      <div key={source.id} className="rounded-xl bg-white/80 p-3 text-xs dark:bg-slate-900/80">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700 dark:text-slate-200">
                          <span>{source.channelName}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            {source.type}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                          <span>{source.sourceDate || '날짜 미기재'}</span>
                          {source.timestamp ? <span>· {source.timestamp}</span> : null}
                        </div>
                        {source.note ? (
                          <p className="mt-2 text-slate-600 dark:text-slate-300">{source.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">출처가 등록되면 카드 형태로 나열됩니다.</p>
                )}
              </SectionCard>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AdminNewPage;
