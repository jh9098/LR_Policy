// frontend/src/pages/admin/AdminNewPage.jsx
// Step 11B 사양에 맞춰 JSON 임포트 유효성 검증과 issueDraft 단일 상태 관리를 구현한다.
// JSON.parse 에러는 그대로 사용자에게 안내하고, 자동 보정은 수행하지 않는다.

import { useEffect, useMemo, useState } from 'react';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { API_BASE_URL } from '../../config.js';
import { emptyDraft } from '../../utils/emptyDraft.js';
import { loadDraftFromJson } from '../../utils/loadDraftFromJson.js';

const STORAGE_KEY = 'adminDraftV3';
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

function AdminNewPage() {
  const [issueDraft, setIssueDraft] = useState(() => {
    if (typeof window === 'undefined') {
      return createEmptyDraftState();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return loadDraftFromJson(stored);
      }
    } catch (error) {
      console.warn('로컬 스토리지 복구 실패:', error);
    }
    return createEmptyDraftState();
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
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-500">
            Admin · New Issue
          </p>
          <h1 className="text-3xl font-extrabold">신규 이슈 등록</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            AI가 생성한 issueDraft JSON을 붙여넣고 불러오면 모든 필드가 자동으로 채워집니다. JSON
            형식이 잘못되면 즉시 오류를 표시하므로, 문자열 내부 줄바꿈이 없는지 확인한 뒤 다시 시도해 주세요.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold">AI JSON 붙여넣기</h2>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder='{
  "title": "...",
  "summaryCard": "..."
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
                <h2 className="text-lg font-semibold">핵심 포인트 (bullet)</h2>
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  bullet 추가
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                JSON이 비어 있으면 수동으로 bullet을 추가해 내용을 입력할 수 있습니다.
              </p>
              <div className="mt-4 space-y-4">
                {issueDraft.keyPoints.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    bullet을 추가해 핵심 포인트를 정리하세요.
                  </p>
                ) : null}
                {issueDraft.keyPoints.map((point, index) => (
                  <div key={`key-point-${index}`} className="flex gap-3">
                    <textarea
                      value={point}
                      onChange={(event) => handleKeyPointChange(index, event.target.value)}
                      className="min-h-[80px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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

            <div className="space-y-8">
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
                        placeholder="진보 진영의 핵심 주장 제목"
                      />
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">bullet</span>
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
                        placeholder="보수 진영의 핵심 주장 제목"
                      />
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">bullet</span>
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
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">출처 목록</h2>
                <button
                  type="button"
                  onClick={addSource}
                  className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  출처 추가
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                type, channelName, 날짜, 타임스탬프, 비고를 그대로 Firestore에 저장합니다.
              </p>
              <div className="mt-4 space-y-6">
                {issueDraft.sources.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    출처를 최소 1개 이상 입력해 주세요.
                  </p>
                ) : null}
                {issueDraft.sources.map((source, index) => (
                  <div key={`source-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-600 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 text-sm">
                      <label className="flex flex-col gap-2">
                        <span className="font-medium">type</span>
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

                      <label className="flex flex-col gap-2">
                        <span className="font-medium">channelName</span>
                        <input
                          type="text"
                          value={source.channelName}
                          onChange={(event) => handleSourceChange(index, 'channelName', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="font-medium">sourceDate (YYYY-MM-DD 또는 정보 부족)</span>
                        <input
                          type="text"
                          value={source.sourceDate}
                          onChange={(event) => handleSourceChange(index, 'sourceDate', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="font-medium">timestamp (없으면 비워두세요)</span>
                        <input
                          type="text"
                          value={source.timestamp}
                          onChange={(event) => handleSourceChange(index, 'timestamp', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="font-medium">note</span>
                        <textarea
                          value={source.note}
                          onChange={(event) => handleSourceChange(index, 'note', event.target.value)}
                          className="min-h-[60px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                      >
                        출처 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? '등록 중...' : '등록하기'}
              </button>
              {submitError ? (
                <p className="rounded-lg border border-rose-400 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                  {submitError}
                </p>
              ) : null}
              {submitSuccess ? (
                <p className="rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {submitSuccess}
                </p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {issueDraft.category}
                </p>
                <h3 className="text-2xl font-bold leading-tight">{issueDraft.title || '제목 미입력'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{issueDraft.date || '날짜 미입력'}</p>
              </div>

              <SectionCard title="요약" tone="neutral">
                <p>{issueDraft.summaryCard || '요약이 아직 작성되지 않았습니다.'}</p>
              </SectionCard>

              <SectionCard title="배경" tone="neutral">
                {previewBackgroundParagraphs.length > 0 ? (
                  previewBackgroundParagraphs.map((paragraph, index) => (
                    <p key={`background-${index}`}>{paragraph}</p>
                  ))
                ) : (
                  <p className="text-slate-500">배경 설명이 비어 있습니다.</p>
                )}
              </SectionCard>

              <SectionCard title="핵심 포인트" tone="neutral">
                {previewKeyPoints.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {previewKeyPoints.map((point, index) => (
                      <li key={`preview-point-${index}`}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">bullet을 입력해 주세요.</p>
                )}
              </SectionCard>

              {issueDraft.progressiveView ? (
                <SectionCard title="진보 시각" badgeText="Progressive" tone="progressive">
                  <h4 className="text-base font-semibold">{issueDraft.progressiveView.headline || '헤드라인 미입력'}</h4>
                  {issueDraft.progressiveView.intensity >= 0 ? (
                    <IntensityBar
                      value={issueDraft.progressiveView.intensity}
                      label="주장 강도"
                      colorClass="bg-emerald-500"
                    />
                  ) : null}
                  {issueDraft.progressiveView.bullets?.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {issueDraft.progressiveView.bullets.map((bullet, index) => (
                        <li key={`progressive-preview-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-900/70 dark:text-emerald-200/80">bullet이 비어 있습니다.</p>
                  )}
                  <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-100">
                    {issueDraft.progressiveView.note}
                  </p>
                </SectionCard>
              ) : null}

              {issueDraft.conservativeView ? (
                <SectionCard title="보수 시각" badgeText="Conservative" tone="conservative">
                  <h4 className="text-base font-semibold">{issueDraft.conservativeView.headline || '헤드라인 미입력'}</h4>
                  {issueDraft.conservativeView.intensity >= 0 ? (
                    <IntensityBar
                      value={issueDraft.conservativeView.intensity}
                      label="주장 강도"
                      colorClass="bg-rose-500"
                    />
                  ) : null}
                  {issueDraft.conservativeView.bullets?.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {issueDraft.conservativeView.bullets.map((bullet, index) => (
                        <li key={`conservative-preview-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-rose-900/70 dark:text-rose-200/80">bullet이 비어 있습니다.</p>
                  )}
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-900 dark:text-rose-100">
                    {issueDraft.conservativeView.note}
                  </p>
                </SectionCard>
              ) : null}

              {issueDraft.impactToLife ? (
                <SectionCard title="이게 내 삶에 뭐가 변함?" badgeText="Impact" tone="impact">
                  <p>{issueDraft.impactToLife.text || '내용 미입력'}</p>
                  <p className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-900 dark:text-indigo-100">
                    {issueDraft.impactToLife.note}
                  </p>
                </SectionCard>
              ) : null}

              <SectionCard title="출처" tone="neutral">
                {previewSources.length > 0 ? (
                  <div className="space-y-4">
                    {previewSources.map((source) => (
                      <div key={source.id} className="rounded-lg border border-slate-200 bg-white/60 p-3 dark:border-slate-600 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {source.type}
                        </p>
                        <p className="text-sm font-medium">{source.channelName || 'channelName 미입력'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {source.sourceDate || '날짜 미입력'}
                          {source.timestamp ? ` · ${source.timestamp}` : ''}
                        </p>
                        {source.note ? (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{source.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">출처가 아직 없습니다.</p>
                )}
              </SectionCard>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default AdminNewPage;
