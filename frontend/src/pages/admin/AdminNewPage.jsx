// frontend/src/pages/admin/AdminNewPage.jsx
// 새 글을 Firestore에 직접 등록하는 페이지다. Render 백엔드를 거치지 않고 브라우저에서 addDoc을 실행한다.
// TODO: 이 페이지는 완전히 클라이언트 사이드에서 Firestore에 직접 쓰기 때문에 현재 누구나 글 생성 가능. 실제 서비스 단계에서는 /admin 접근 제한과 Firestore 보안 규칙 강화가 필요하다.

import { useEffect, useMemo, useState } from 'react';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { createIssue } from '../../firebaseClient.js';
import { emptyDraft } from '../../utils/emptyDraft.js';
import { loadDraftFromJson } from '../../utils/loadDraftFromJson.js';

const STORAGE_KEY = 'adminDraftV4';
const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function AdminNewPage() {
  const [issueDraft, setIssueDraft] = useState(() => ({ ...emptyDraft }));
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 최초 진입 시 localStorage에서 임시 저장한 초안을 불러온다.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setIssueDraft({ ...emptyDraft, ...parsed });
      }
    } catch (error) {
      console.warn('로컬 초안 불러오기 실패:', error);
    }
  }, []);

  // 초안이 변경될 때마다 localStorage에 저장한다.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issueDraft));
    } catch (error) {
      console.warn('로컬 초안 저장 실패:', error);
    }
  }, [issueDraft]);

  const previewBackgroundParagraphs = useMemo(() => {
    if (!issueDraft.background) {
      return [];
    }
    return issueDraft.background
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [issueDraft.background]);

  const previewKeyPoints = useMemo(() => {
    if (!Array.isArray(issueDraft.keyPoints)) {
      return [];
    }
    return issueDraft.keyPoints.map((point) => point.trim()).filter(Boolean);
  }, [issueDraft.keyPoints]);

  const previewSources = useMemo(() => {
    if (!Array.isArray(issueDraft.sources)) {
      return [];
    }
    return issueDraft.sources
      .map((source, index) => ({
        id: `${source.channelName || 'source'}-${index}`,
        type: source.type || 'etc',
        channelName: source.channelName || '',
        sourceDate: source.sourceDate || '',
        timestamp: source.timestamp || '',
        note: source.note || '',
      }))
      .filter((source) => source.channelName);
  }, [issueDraft.sources]);

  const handleBasicFieldChange = (field, value) => {
    setIssueDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSubmitError('');
  };

  const handleKeyPointsChange = (index, value) => {
    setIssueDraft((prev) => {
      const points = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      points[index] = value;
      return { ...prev, keyPoints: points };
    });
    setSubmitError('');
  };

  const addKeyPoint = () => {
    setIssueDraft((prev) => ({
      ...prev,
      keyPoints: [...(Array.isArray(prev.keyPoints) ? prev.keyPoints : []), ''],
    }));
    setSubmitError('');
  };

  const removeKeyPoint = (index) => {
    setIssueDraft((prev) => {
      const points = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      points.splice(index, 1);
      return { ...prev, keyPoints: points };
    });
    setSubmitError('');
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
          note: defaultNote,
        },
      };
    });
    setSubmitError('');
  };

  const removePerspective = (key) => {
    setIssueDraft((prev) => ({
      ...prev,
      [key]: null,
    }));
    setSubmitError('');
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
            [key]: { ...current, intensity: -1 },
          };
        }
        const numeric = Number(value);
        const safeValue = Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : -1;
        return {
          ...prev,
          [key]: { ...current, intensity: safeValue },
        };
      }
      return {
        ...prev,
        [key]: { ...current, [field]: value },
      };
    });
    setSubmitError('');
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
        [key]: { ...current, bullets },
      };
    });
    setSubmitError('');
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
        [key]: { ...current, bullets },
      };
    });
    setSubmitError('');
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
        [key]: { ...current, bullets },
      };
    });
    setSubmitError('');
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
          note: IMPACT_NOTE,
        },
      };
    });
    setSubmitError('');
  };

  const removeImpactSection = () => {
    setIssueDraft((prev) => ({
      ...prev,
      impactToLife: null,
    }));
    setSubmitError('');
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
          [field]: value,
        },
      };
    });
    setSubmitError('');
  };

  const handleSourceChange = (index, field, value) => {
    setIssueDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      const current = sources[index] || { type: 'etc', channelName: '', sourceDate: '', timestamp: '', note: '' };
      sources[index] = {
        ...current,
        [field]: value,
      };
      return { ...prev, sources };
    });
    setSubmitError('');
  };

  const addSource = () => {
    setIssueDraft((prev) => ({
      ...prev,
      sources: [
        ...(Array.isArray(prev.sources) ? prev.sources : []),
        { type: 'media', channelName: '', sourceDate: '', timestamp: '', note: '' },
      ],
    }));
    setSubmitError('');
  };

  const removeSource = (index) => {
    setIssueDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      sources.splice(index, 1);
      return { ...prev, sources };
    });
    setSubmitError('');
  };

  const handleLoadJson = () => {
    try {
      const mergedDraft = loadDraftFromJson(jsonInput);
      setIssueDraft(mergedDraft);
      setJsonError('');
    } catch (error) {
      console.error('JSON 불러오기 실패:', error);
      setJsonError(error.message);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const docId = await createIssue(issueDraft);
      alert(`등록 완료! 문서 ID: ${docId}`);
      setIssueDraft({ ...emptyDraft });
      setJsonInput('');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Firestore 등록 실패:', error);
      setSubmitError(error.message || 'Firestore에 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">새 정책/사건 등록</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            AI가 생성한 JSON 초안을 붙여넣거나 아래 폼에 직접 입력하세요. 저장 버튼을 누르면 Firestore Web SDK가 addDoc()을 실행합니다.
          </p>
        </header>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          AI JSON 결과 붙여넣기
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder="JSON 문자열 전체를 붙여넣으세요."
            className="min-h-[140px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLoadJson}
            className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20 dark:focus-visible:ring-offset-slate-900"
          >
            불러오기
          </button>
          {jsonError && <p className="text-sm text-rose-500">{jsonError}</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,420px)]">
        <main className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">기본 정보</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                쉬운 요약 (일반인 설명용)
                <textarea
                  value={issueDraft.easySummary}
                  onChange={(event) => handleBasicFieldChange('easySummary', event.target.value)}
                  className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                제목
                <input
                  type="text"
                  value={issueDraft.title}
                  onChange={(event) => handleBasicFieldChange('title', event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                날짜 (YYYY-MM-DD 혹은 정보 부족)
                <input
                  type="text"
                  value={issueDraft.date}
                  onChange={(event) => handleBasicFieldChange('date', event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                카테고리
                <select
                  value={issueDraft.category}
                  onChange={(event) => handleBasicFieldChange('category', event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="부동산">부동산</option>
                  <option value="노동/노조">노동/노조</option>
                  <option value="사법/검찰">사법/검찰</option>
                  <option value="외교/안보">외교/안보</option>
                  <option value="기타">기타</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              메인 카드 요약 (summaryCard)
              <textarea
                value={issueDraft.summaryCard}
                onChange={(event) => handleBasicFieldChange('summaryCard', event.target.value)}
                className="min-h-[100px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              배경/맥락 설명
              <textarea
                value={issueDraft.background}
                onChange={(event) => handleBasicFieldChange('background', event.target.value)}
                className="min-h-[160px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">핵심 쟁점 bullet</h2>
              <button
                type="button"
                onClick={addKeyPoint}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                bullet 추가
              </button>
            </div>
            <div className="space-y-3">
              {issueDraft.keyPoints.map((point, index) => (
                <div key={`keypoint-${index}`} className="flex items-start gap-3">
                  <textarea
                    value={point}
                    onChange={(event) => handleKeyPointsChange(index, event.target.value)}
                    className="min-h-[60px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyPoint(index)}
                    className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                  >
                    삭제
                  </button>
                </div>
              ))}
              {issueDraft.keyPoints.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 없습니다. 추가 버튼을 눌러 입력하세요.</p>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">주요 시각 (진보/보수)</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => ensurePerspective('progressiveView', PROGRESSIVE_NOTE)}
                  className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20 dark:focus-visible:ring-offset-slate-900"
                >
                  진보 시각 추가
                </button>
                <button
                  type="button"
                  onClick={() => ensurePerspective('conservativeView', CONSERVATIVE_NOTE)}
                  className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                >
                  보수 시각 추가
                </button>
              </div>
            </div>

            {['progressiveView', 'conservativeView'].map((key) => {
              const label = key === 'progressiveView' ? '진보 시각' : '보수 시각';
              const defaultNote = key === 'progressiveView' ? PROGRESSIVE_NOTE : CONSERVATIVE_NOTE;
              const tone = key === 'progressiveView' ? 'progressive' : 'conservative';
              const colorClass = key === 'progressiveView' ? 'bg-emerald-500' : 'bg-rose-500';
              const current = issueDraft[key];

              if (!current) {
                return null;
              }

              return (
                <div key={key} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
                    <button
                      type="button"
                      onClick={() => removePerspective(key)}
                      className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                    >
                      섹션 제거
                    </button>
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    헤드라인
                    <input
                      type="text"
                      value={current.headline}
                      onChange={(event) => handlePerspectiveFieldChange(key, 'headline', event.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">bullet</span>
                      <button
                        type="button"
                        onClick={() => addPerspectiveBullet(key)}
                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        bullet 추가
                      </button>
                    </div>
                    {current.bullets.map((bullet, index) => (
                      <div key={`${key}-bullet-${index}`} className="flex items-start gap-3">
                        <textarea
                          value={bullet}
                          onChange={(event) => handlePerspectiveBulletChange(key, index, event.target.value)}
                          className="min-h-[60px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removePerspectiveBullet(key, index)}
                          className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                    {current.bullets.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 없습니다.</p>
                    )}
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    강도 (0~100, 비어 있으면 -1)
                    <input
                      type="number"
                      value={current.intensity === -1 ? '' : current.intensity}
                      onChange={(event) => handlePerspectiveFieldChange(key, 'intensity', event.target.value)}
                      min={0}
                      max={100}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    메모
                    <textarea
                      value={current.note}
                      onChange={(event) => handlePerspectiveFieldChange(key, 'note', event.target.value)}
                      placeholder={defaultNote}
                      className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <SectionCard title={`${label} 미리보기`} tone={tone}>
                    {current.bullets.length > 0 ? (
                      <ul className="space-y-1 list-disc pl-5">
                        {current.bullets.map((item, index) => (
                          <li key={`preview-${key}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 비어 있습니다.</p>
                    )}
                    {current.intensity !== -1 && <IntensityBar value={current.intensity} colorClass={colorClass} />}
                    <p className="text-xs text-slate-600 dark:text-slate-300">{current.note || defaultNote}</p>
                  </SectionCard>
                </div>
              );
            })}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">이게 내 삶에 뭐가 변함?</h2>
              {issueDraft.impactToLife ? (
                <button
                  type="button"
                  onClick={removeImpactSection}
                  className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                >
                  섹션 제거
                </button>
              ) : (
                <button
                  type="button"
                  onClick={ensureImpactSection}
                  className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20 dark:focus-visible:ring-offset-slate-900"
                >
                  섹션 추가
                </button>
              )}
            </div>

            {issueDraft.impactToLife ? (
              <div className="space-y-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  요약 문장
                  <textarea
                    value={issueDraft.impactToLife.text}
                    onChange={(event) => handleImpactChange('text', event.target.value)}
                    className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  메모
                  <textarea
                    value={issueDraft.impactToLife.note}
                    onChange={(event) => handleImpactChange('note', event.target.value)}
                    placeholder={IMPACT_NOTE}
                    className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">섹션이 비활성화되어 있습니다.</p>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">출처 목록</h2>
              <button
                type="button"
                onClick={addSource}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                출처 추가
              </button>
            </div>
            <div className="space-y-4">
              {issueDraft.sources.map((source, index) => (
                <div key={`source-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900/60 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    유형 (official/youtube/media/etc)
                    <input
                      type="text"
                      value={source.type}
                      onChange={(event) => handleSourceChange(index, 'type', event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    채널/기관
                    <input
                      type="text"
                      value={source.channelName}
                      onChange={(event) => handleSourceChange(index, 'channelName', event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    날짜 (YYYY-MM-DD)
                    <input
                      type="text"
                      value={source.sourceDate}
                      onChange={(event) => handleSourceChange(index, 'sourceDate', event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    타임스탬프 (없으면 빈칸)
                    <input
                      type="text"
                      value={source.timestamp}
                      onChange={(event) => handleSourceChange(index, 'timestamp', event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    요약 메모
                    <textarea
                      value={source.note}
                      onChange={(event) => handleSourceChange(index, 'note', event.target.value)}
                      className="min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-slate-900"
                    >
                      출처 삭제
                    </button>
                  </div>
                </div>
              ))}
              {issueDraft.sources.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">출처가 없습니다. 출처 추가 버튼을 눌러 주세요.</p>
              )}
            </div>
          </section>

          {submitError && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">미리보기</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">실제 상세 페이지 구성과 유사하게 표시됩니다.</p>
          </div>

          {issueDraft.easySummary && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
              <h3 className="text-sm font-semibold uppercase tracking-wide">쉬운 요약</h3>
              <p className="mt-2 text-sm leading-relaxed">{issueDraft.easySummary}</p>
            </section>
          )}

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
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">아래 내용은 일부 진영의 주장과 전망으로, 사실 여부가 확정되지 않은 의견일 수 있습니다.</p>
              </div>
              <div className="grid gap-4">
                {issueDraft.progressiveView && (
                  <SectionCard title={issueDraft.progressiveView.headline || '진보 시각'} tone="progressive">
                    {issueDraft.progressiveView.bullets.length > 0 ? (
                      <ul className="space-y-1 list-disc pl-5">
                        {issueDraft.progressiveView.bullets.map((item, index) => (
                          <li key={`preview-progressive-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 비어 있습니다.</p>
                    )}
                    {issueDraft.progressiveView.intensity !== -1 && <IntensityBar value={issueDraft.progressiveView.intensity} colorClass="bg-emerald-500" />}
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">{issueDraft.progressiveView.note || PROGRESSIVE_NOTE}</p>
                  </SectionCard>
                )}

                {issueDraft.conservativeView && (
                  <SectionCard title={issueDraft.conservativeView.headline || '보수 시각'} tone="conservative">
                    {issueDraft.conservativeView.bullets.length > 0 ? (
                      <ul className="space-y-1 list-disc pl-5">
                        {issueDraft.conservativeView.bullets.map((item, index) => (
                          <li key={`preview-conservative-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">bullet이 비어 있습니다.</p>
                    )}
                    {issueDraft.conservativeView.intensity !== -1 && <IntensityBar value={issueDraft.conservativeView.intensity} colorClass="bg-rose-500" />}
                    <p className="text-xs text-rose-900/80 dark:text-rose-200/80">{issueDraft.conservativeView.note || CONSERVATIVE_NOTE}</p>
                  </SectionCard>
                )}
              </div>
            </section>
          )}

          {issueDraft.impactToLife && (
            <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
              <p>{issueDraft.impactToLife.text || '설명이 비어 있습니다.'}</p>
              <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80">{issueDraft.impactToLife.note || IMPACT_NOTE}</p>
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
        </aside>
      </div>
    </div>
  );
}

export default AdminNewPage;
