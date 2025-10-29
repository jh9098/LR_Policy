// frontend/src/pages/admin/AdminNewPage.jsx
// Step 12 사양: easySummary 필드를 포함한 issueDraft 스키마 전면 관리, JSON 임포트, 미리보기, POST 등록을 제공한다.

import { useEffect, useMemo, useState } from 'react';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { API_BASE_URL } from '../../config.js';
import { emptyDraft } from '../../utils/emptyDraft.js';
import { loadDraftFromJson } from '../../utils/loadDraftFromJson.js';

const STORAGE_KEY = 'adminDraftV4';
const LEGACY_STORAGE_KEY = 'adminDraftV3';
const CATEGORY_OPTIONS = ['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];
const SOURCE_TYPE_OPTIONS = [
  { value: 'official', label: '공식 발표' },
  { value: 'youtube', label: '유튜브' },
  { value: 'media', label: '언론/매체' },
  { value: 'etc', label: '기타' }
];

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function createEmptyDraftState() {
  return {
    ...emptyDraft,
    keyPoints: [...emptyDraft.keyPoints],
    sources: [...emptyDraft.sources]
  };
}

function restoreDraftFromStorage() {
  if (typeof window === 'undefined') {
    return createEmptyDraftState();
  }

  const candidates = [STORAGE_KEY, LEGACY_STORAGE_KEY];
  for (const key of candidates) {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        continue;
      }
      const parsed = loadDraftFromJson(stored);
      if (key === LEGACY_STORAGE_KEY) {
        // 새 구조로 덮어쓰기 후 이전 버전 값은 제거한다.
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      return parsed;
    } catch (error) {
      console.warn(`로컬 스토리지(${key}) 복구 실패:`, error);
    }
  }

  return createEmptyDraftState();
}

function AdminNewPage() {
  const [issueDraft, setIssueDraft] = useState(() => restoreDraftFromStorage());
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issueDraft));
    } catch (error) {
      console.warn('로컬 스토리지 저장 실패:', error);
    }
  }, [issueDraft]);

  const previewBackgroundParagraphs = useMemo(() => {
    if (!issueDraft.background) {
      return [];
    }
    return issueDraft.background
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }, [issueDraft.background]);

  const previewKeyPoints = useMemo(() => {
    if (!Array.isArray(issueDraft.keyPoints)) {
      return [];
    }
    return issueDraft.keyPoints
      .map((point) => (typeof point === 'string' ? point : String(point ?? '')))
      .filter((point) => point.length > 0);
  }, [issueDraft.keyPoints]);

  const previewSources = useMemo(() => {
    if (!Array.isArray(issueDraft.sources)) {
      return [];
    }
    return issueDraft.sources.map((source, index) => ({
      id: `${index}-${source?.channelName ?? 'source'}`,
      type: typeof source?.type === 'string' ? source.type : 'etc',
      channelName: typeof source?.channelName === 'string' ? source.channelName : '',
      sourceDate: typeof source?.sourceDate === 'string' ? source.sourceDate : '',
      timestamp: typeof source?.timestamp === 'string' ? source.timestamp : '',
      note: typeof source?.note === 'string' ? source.note : ''
    }));
  }, [issueDraft.sources]);

  const handleLoadJson = () => {
    try {
      const parsed = loadDraftFromJson(jsonInput);
      setIssueDraft(parsed);
      setJsonError('');
      setSubmitSuccess('');
    } catch (error) {
      const message = error?.message ?? 'JSON 파싱 중 알 수 없는 오류가 발생했습니다.';
      setJsonError(`❌ JSON 형식 오류: ${message} / 문자열 내 줄바꿈(엔터) 제거 후 다시 요청 필요`);
    }
  };

  const handleDraftFieldChange = (field) => (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({ ...prev, [field]: value }));
    setSubmitSuccess('');
  };

  const handleEasySummaryChange = (event) => {
    const value = event.target.value.replace(/\n+/g, ' ').trimStart();
    setIssueDraft((prev) => ({ ...prev, easySummary: value }));
    setSubmitSuccess('');
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({
      ...prev,
      category: CATEGORY_OPTIONS.includes(value) ? value : prev.category
    }));
    setSubmitSuccess('');
  };

  const handleKeyPointChange = (index, value) => {
    setIssueDraft((prev) => {
      const nextPoints = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      nextPoints[index] = value;
      return { ...prev, keyPoints: nextPoints };
    });
    setSubmitSuccess('');
  };

  const addKeyPoint = () => {
    setIssueDraft((prev) => ({
      ...prev,
      keyPoints: [...(Array.isArray(prev.keyPoints) ? prev.keyPoints : []), '']
    }));
    setSubmitSuccess('');
  };

  const removeKeyPoint = (index) => {
    setIssueDraft((prev) => {
      const nextPoints = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      nextPoints.splice(index, 1);
      return { ...prev, keyPoints: nextPoints };
    });
    setSubmitSuccess('');
  };

  const ensurePerspective = (key, defaultNote) => {
    setIssueDraft((prev) => {
      if (prev[key]) {
        return prev;
      }
      return {
        ...prev,
        [key]: {
          headline: '',
          bullets: [''],
          intensity: -1,
          note: defaultNote
        }
      };
    });
    setSubmitSuccess('');
  };

  const removePerspective = (key) => {
    setIssueDraft((prev) => ({
      ...prev,
      [key]: null
    }));
    setSubmitSuccess('');
  };

  const handlePerspectiveFieldChange = (key, field, value) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }

      if (field === 'intensity') {
        if (value === '') {
          return {
            ...prev,
            [key]: { ...current, intensity: -1 }
          };
        }

        const numeric = Number(value);
        const safeValue = Number.isFinite(numeric)
          ? Math.min(100, Math.max(0, Math.round(numeric)))
          : -1;
        return {
          ...prev,
          [key]: { ...current, intensity: safeValue }
        };
      }

      return {
        ...prev,
        [key]: { ...current, [field]: value }
      };
    });
    setSubmitSuccess('');
  };

  const handlePerspectiveBulletChange = (key, index, value) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets] : [];
      bullets[index] = value;
      return {
        ...prev,
        [key]: { ...current, bullets }
      };
    });
    setSubmitSuccess('');
  };

  const addPerspectiveBullet = (key) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets, ''] : [''];
      return {
        ...prev,
        [key]: { ...current, bullets }
      };
    });
    setSubmitSuccess('');
  };

  const removePerspectiveBullet = (key, index) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets] : [];
      bullets.splice(index, 1);
      return {
        ...prev,
        [key]: { ...current, bullets }
      };
    });
    setSubmitSuccess('');
  };

  const ensureImpactSection = () => {
    setIssueDraft((prev) => {
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
    setSubmitSuccess('');
  };

  const removeImpactSection = () => {
    setIssueDraft((prev) => ({
      ...prev,
      impactToLife: null
    }));
    setSubmitSuccess('');
  };

  const handleImpactChange = (field, value) => {
    setIssueDraft((prev) => {
      if (!prev.impactToLife) {
        return prev;
      }
      return {
        ...prev,
        impactToLife: {
          ...prev.impactToLife,
          [field]: value
        }
      };
    });
    setSubmitSuccess('');
  };

  const addSource = () => {
    setIssueDraft((prev) => ({
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
    setSubmitSuccess('');
  };

  const handleSourceChange = (index, field, value) => {
    setIssueDraft((prev) => {
      const nextSources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      const target = nextSources[index] ?? {
        type: 'official',
        channelName: '',
        sourceDate: '',
        timestamp: '',
        note: ''
      };
      nextSources[index] = {
        ...target,
        [field]: value
      };
      return { ...prev, sources: nextSources };
    });
    setSubmitSuccess('');
  };

  const handleSourceTypeChange = (index, event) => {
    const { value } = event.target;
    handleSourceChange(index, 'type', value);
  };

  const removeSource = (index) => {
    setIssueDraft((prev) => {
      const nextSources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      nextSources.splice(index, 1);
      return { ...prev, sources: nextSources };
    });
    setSubmitSuccess('');
  };

  const resetDraft = (preserveSuccess = false) => {
    const freshDraft = createEmptyDraftState();
    setIssueDraft(freshDraft);
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
        console.warn('로컬 스토리지 초기화 실패:', error);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // TODO: 실서비스에서는 x-admin-secret 같은 인증/권한 검증 헤더를 반드시 추가해야 한다.
        body: JSON.stringify(issueDraft)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '등록 요청이 실패했습니다.');
      }

      window.alert('등록 완료');
      setSubmitSuccess('등록이 완료되어 Firestore에 저장되었습니다.');
      resetDraft(true);
    } catch (error) {
      console.error('등록 실패:', error);
      setSubmitError(error?.message || '등록 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-500">Admin · New Issue</p>
          <h1 className="text-3xl font-extrabold">신규 이슈 등록</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            AI가 생성한 issueDraft JSON을 붙여넣고 불러오면 모든 필드가 자동으로 채워집니다. JSON 형식이 잘못되면 즉시 오류를
            표시하므로, 문자열 내부 줄바꿈이 없는지 확인한 뒤 다시 시도해 주세요.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold">AI JSON 붙여넣기</h2>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder='{
  "easySummary": "...",
  "title": "..."
}'
            className="min-h-[160px] w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLoadJson}
              className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              불러오기
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              초기화
            </button>
            {jsonError ? (
              <p className="rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                {jsonError}
              </p>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <section className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">기본 정보</h2>
              <div className="mt-4 grid grid-cols-1 gap-6">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">쉬운 요약 (일반인 설명용)</span>
                  <input
                    type="text"
                    value={issueDraft.easySummary}
                    onChange={handleEasySummaryChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="쉽게 말하면, 이번 조치는 정부가 A 문제를 직접 조사하겠다는 뜻이에요."
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    정치/법을 잘 모르는 독자도 이해할 수 있도록 1~2문장을 한 줄로 작성해 주세요.
                  </span>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">제목</span>
                  <input
                    type="text"
                    value={issueDraft.title}
                    onChange={handleDraftFieldChange('title')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="예: 00법 통과, 부동산 시장 전망은?"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">날짜 (YYYY-MM-DD 또는 정보 부족)</span>
                  <input
                    type="text"
                    value={issueDraft.date}
                    onChange={handleDraftFieldChange('date')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="2024-01-01"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">카테고리</span>
                  <select
                    value={issueDraft.category}
                    onChange={handleCategoryChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">홈 요약 카드</span>
                  <textarea
                    value={issueDraft.summaryCard}
                    onChange={handleDraftFieldChange('summaryCard')}
                    className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="핵심 요약을 2~3줄로 작성하세요."
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">배경 정리</span>
                  <textarea
                    value={issueDraft.background}
                    onChange={handleDraftFieldChange('background')}
                    className="min-h-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="사건 경과, 핵심 쟁점 등을 자유롭게 정리합니다."
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">핵심 bullet</h2>
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  bullet 추가
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">각 bullet은 한 줄 문장으로 작성해 주세요.</p>
              <div className="mt-4 space-y-3">
                {issueDraft.keyPoints.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    bullet을 추가해 핵심 쟁점을 정리하세요.
                  </p>
                ) : null}
                {issueDraft.keyPoints.map((point, index) => (
                  <div key={`key-point-${index}`} className="flex gap-3">
                    <textarea
                      value={point}
                      onChange={(event) => handleKeyPointChange(index, event.target.value)}
                      className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={`bullet ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(index)}
                      className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">진보 시각</h2>
                {issueDraft.progressiveView ? (
                  <button
                    type="button"
                    onClick={() => removePerspective('progressiveView')}
                    className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensurePerspective('progressiveView', PROGRESSIVE_NOTE)}
                    className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>

              {issueDraft.progressiveView ? (
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={issueDraft.progressiveView.headline}
                      onChange={(event) =>
                        handlePerspectiveFieldChange('progressiveView', 'headline', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">bullet</span>
                      <button
                        type="button"
                        onClick={() => addPerspectiveBullet('progressiveView')}
                        className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        bullet 추가
                      </button>
                    </div>
                    {issueDraft.progressiveView.bullets.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        bullet을 추가해 세부 주장을 정리하세요.
                      </p>
                    ) : null}
                    {issueDraft.progressiveView.bullets.map((bullet, index) => (
                      <div key={`progressive-${index}`} className="flex gap-3">
                        <textarea
                          value={bullet}
                          onChange={(event) =>
                            handlePerspectiveBulletChange('progressiveView', index, event.target.value)
                          }
                          className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder={`bullet ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removePerspectiveBullet('progressiveView', index)}
                          className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100 또는 비워두면 -1)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={
                        issueDraft.progressiveView.intensity === -1
                          ? ''
                          : issueDraft.progressiveView.intensity
                      }
                      onChange={(event) =>
                        handlePerspectiveFieldChange('progressiveView', 'intensity', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.progressiveView.note}
                      onChange={(event) =>
                        handlePerspectiveFieldChange('progressiveView', 'note', event.target.value)
                      }
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">보수 시각</h2>
                {issueDraft.conservativeView ? (
                  <button
                    type="button"
                    onClick={() => removePerspective('conservativeView')}
                    className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensurePerspective('conservativeView', CONSERVATIVE_NOTE)}
                    className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>

              {issueDraft.conservativeView ? (
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={issueDraft.conservativeView.headline}
                      onChange={(event) =>
                        handlePerspectiveFieldChange('conservativeView', 'headline', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">bullet</span>
                      <button
                        type="button"
                        onClick={() => addPerspectiveBullet('conservativeView')}
                        className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        bullet 추가
                      </button>
                    </div>
                    {issueDraft.conservativeView.bullets.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        bullet을 추가해 세부 주장을 정리하세요.
                      </p>
                    ) : null}
                    {issueDraft.conservativeView.bullets.map((bullet, index) => (
                      <div key={`conservative-${index}`} className="flex gap-3">
                        <textarea
                          value={bullet}
                          onChange={(event) =>
                            handlePerspectiveBulletChange('conservativeView', index, event.target.value)
                          }
                          className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder={`bullet ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removePerspectiveBullet('conservativeView', index)}
                          className="mt-1 inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100 또는 비워두면 -1)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={
                        issueDraft.conservativeView.intensity === -1
                          ? ''
                          : issueDraft.conservativeView.intensity
                      }
                      onChange={(event) =>
                        handlePerspectiveFieldChange('conservativeView', 'intensity', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.conservativeView.note}
                      onChange={(event) =>
                        handlePerspectiveFieldChange('conservativeView', 'note', event.target.value)
                      }
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">이게 내 삶에 뭐가 변함?</h2>
                {issueDraft.impactToLife ? (
                  <button
                    type="button"
                    onClick={removeImpactSection}
                    className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
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

              {issueDraft.impactToLife ? (
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">설명</span>
                    <textarea
                      value={issueDraft.impactToLife.text}
                      onChange={(event) => handleImpactChange('text', event.target.value)}
                      className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="독자 관점에서 체감 변화나 영향을 설명하세요."
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.impactToLife.note}
                      onChange={(event) => handleImpactChange('note', event.target.value)}
                      className="min-h-[60px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">출처</h2>
                <button
                  type="button"
                  onClick={addSource}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-100 dark:text-slate-900"
                >
                  출처 추가
                </button>
              </div>

              <div className="mt-4 space-y-5">
                {issueDraft.sources.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    최소 1개의 출처를 입력해야 합니다.
                  </p>
                ) : null}

                {issueDraft.sources.map((source, index) => (
                  <div
                    key={previewSources[index]?.id ?? `source-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">출처 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        유형
                        <select
                          value={source.type}
                          onChange={(event) => handleSourceTypeChange(index, event)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {SOURCE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        채널/기관
                        <input
                          type="text"
                          value={source.channelName}
                          onChange={(event) => handleSourceChange(index, 'channelName', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="예: 국토교통부"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        날짜 (YYYY-MM-DD)
                        <input
                          type="text"
                          value={source.sourceDate}
                          onChange={(event) => handleSourceChange(index, 'sourceDate', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="2024-01-01"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        타임스탬프
                        <input
                          type="text"
                          value={source.timestamp}
                          onChange={(event) => handleSourceChange(index, 'timestamp', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="12:30"
                        />
                      </label>

                      <label className="md:col-span-2 flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        note
                        <textarea
                          value={source.note}
                          onChange={(event) => handleSourceChange(index, 'note', event.target.value)}
                          className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="출처 내용을 한 줄로 정리해 주세요."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3">
              {submitError ? (
                <p className="rounded-lg border border-rose-400 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                  {submitError}
                </p>
              ) : null}
              {submitSuccess ? (
                <p className="rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {submitSuccess}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">미리보기</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">아래 내용은 실제 IssuePage와 거의 동일한 순서로 표시됩니다.</p>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">헤더</h3>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{issueDraft.title || '제목 미입력'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {issueDraft.date && <span className="font-semibold uppercase tracking-wide">{issueDraft.date}</span>}
                  {issueDraft.category && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
                      {issueDraft.category}
                    </span>
                  )}
                </div>
                {issueDraft.summaryCard ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issueDraft.summaryCard}</p>
                ) : (
                  <p className="mt-3 text-xs italic text-slate-400">홈 요약 카드 내용이 없습니다.</p>
                )}
              </section>

              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-600/60 dark:bg-emerald-950/40">
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">쉬운 요약</h3>
                {issueDraft.easySummary ? (
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{issueDraft.easySummary}</p>
                ) : (
                  <p className="mt-2 text-xs italic text-emerald-600 dark:text-emerald-300/70">쉬운 요약을 입력하면 여기에 표시됩니다.</p>
                )}
              </section>

              <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
                {previewBackgroundParagraphs.length > 0 ? (
                  previewBackgroundParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                ) : (
                  <p className="italic text-slate-500 dark:text-slate-400">배경 정보가 아직 입력되지 않았습니다.</p>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">핵심 쟁점 요약</h4>
                  {previewKeyPoints.length > 0 ? (
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      {previewKeyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">요약 bullet이 아직 없습니다.</p>
                  )}
                </div>
              </SectionCard>

              {(issueDraft.progressiveView || issueDraft.conservativeView) && (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">주요 시각들</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      아래 내용은 일부 진영의 주장과 전망을 정리한 것으로, 사실 여부가 확정되지 않은 의견일 수 있습니다.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {issueDraft.progressiveView && (
                      <SectionCard
                        title={issueDraft.progressiveView.headline || '진보 시각'}
                        tone="progressive"
                      >
                        {issueDraft.progressiveView.bullets.length > 0 ? (
                          <ul className="space-y-1 list-disc pl-5">
                            {issueDraft.progressiveView.bullets.map((item, index) => (
                              <li key={`preview-progressive-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 비어 있습니다.</p>
                        )}
                        {issueDraft.progressiveView.intensity !== -1 && (
                          <IntensityBar value={issueDraft.progressiveView.intensity} colorClass="bg-emerald-500" />
                        )}
                        <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
                          {issueDraft.progressiveView.note || PROGRESSIVE_NOTE}
                        </p>
                      </SectionCard>
                    )}

                    {issueDraft.conservativeView && (
                      <SectionCard
                        title={issueDraft.conservativeView.headline || '보수 시각'}
                        tone="conservative"
                      >
                        {issueDraft.conservativeView.bullets.length > 0 ? (
                          <ul className="space-y-1 list-disc pl-5">
                            {issueDraft.conservativeView.bullets.map((item, index) => (
                              <li key={`preview-conservative-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 비어 있습니다.</p>
                        )}
                        {issueDraft.conservativeView.intensity !== -1 && (
                          <IntensityBar value={issueDraft.conservativeView.intensity} colorClass="bg-rose-500" />
                        )}
                        <p className="text-xs text-rose-900/80 dark:text-rose-200/80">
                          {issueDraft.conservativeView.note || CONSERVATIVE_NOTE}
                        </p>
                      </SectionCard>
                    )}
                  </div>
                </section>
              )}

              {issueDraft.impactToLife && (
                <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
                  <p>{issueDraft.impactToLife.text || '설명이 비어 있습니다.'}</p>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80">
                    {issueDraft.impactToLife.note || IMPACT_NOTE}
                  </p>
                </SectionCard>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">출처</h3>
                {previewSources.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">출처가 없습니다.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    {previewSources.map((source) => (
                      <li
                        key={source.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900/60"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">{source.type}</span>
                          {source.sourceDate && <span>{source.sourceDate}</span>}
                          {source.timestamp && <span>{source.timestamp}</span>}
                        </div>
                        <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{source.channelName}</p>
                        <p className="text-slate-600 dark:text-slate-300">{source.note || '요약 미입력'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default AdminNewPage;
