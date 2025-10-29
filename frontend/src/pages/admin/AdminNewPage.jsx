// frontend/src/pages/admin/AdminNewPage.jsx
// 관리자 신규 작성 페이지 - issueDraft 단일 state로 관리하고, JSON 붙여넣기/미리보기/등록을 제공한다.
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

const DEFAULT_SOURCE = {
  type: 'official',
  channelName: '',
  sourceDate: '',
  timestamp: '',
  note: ''
};

const DEFAULT_PROGRESSIVE_VIEW = {
  headline: '',
  bullets: [],
  intensity: -1,
  note: PROGRESSIVE_NOTE
};

const DEFAULT_CONSERVATIVE_VIEW = {
  headline: '',
  bullets: [],
  intensity: -1,
  note: CONSERVATIVE_NOTE
};

const DEFAULT_IMPACT = {
  text: '',
  note: IMPACT_NOTE
};

function getTodayKst() {
  const now = new Date();
  const seoul = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = seoul.getFullYear();
  const month = String(seoul.getMonth() + 1).padStart(2, '0');
  const day = String(seoul.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialDraft() {
  return {
    title: emptyDraft.title,
    date: getTodayKst(),
    category: emptyDraft.category,
    summaryCard: emptyDraft.summaryCard,
    background: emptyDraft.background,
    keyPoints: [],
    progressiveView: null,
    conservativeView: null,
    impactToLife: null,
    sources: []
  };
}

function splitParagraphs(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function sanitizeLinesForPreview(lines) {
  if (!Array.isArray(lines)) {
    return [];
  }
  return lines
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line.length > 0);
}

function toUserString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
}

function normalizeKeyPoints(rawKeyPoints) {
  if (!Array.isArray(rawKeyPoints)) {
    return [];
  }
  return rawKeyPoints.map((item) => toUserString(item));
}

function normalizeBullets(rawBullets) {
  if (!Array.isArray(rawBullets)) {
    return [];
  }
  return rawBullets.map((item) => toUserString(item));
}

function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }
  return rawSources.map((source) => {
    const safeSource = source && typeof source === 'object' ? source : {};
    const type = SOURCE_TYPE_OPTIONS.some((option) => option.value === safeSource.type)
      ? safeSource.type
      : DEFAULT_SOURCE.type;
    const channelName = toUserString(safeSource.channelName);
    const sourceDate = toUserString(safeSource.sourceDate);
    const timestamp = toUserString(safeSource.timestamp);
    const note = toUserString(safeSource.note);
    return {
      ...DEFAULT_SOURCE,
      type,
      channelName,
      sourceDate,
      timestamp,
      note
    };
  });
}

function mergeDraftWithDefaults(rawDraft) {
  const base = createInitialDraft();
  const merged = {
    ...base,
    ...(rawDraft && typeof rawDraft === 'object' ? rawDraft : {})
  };

  merged.keyPoints = normalizeKeyPoints(rawDraft?.keyPoints ?? merged.keyPoints);
  merged.sources = normalizeSources(rawDraft?.sources ?? merged.sources);

  if (rawDraft?.progressiveView) {
    merged.progressiveView = {
      ...DEFAULT_PROGRESSIVE_VIEW,
      ...(rawDraft.progressiveView || {}),
      note:
        typeof rawDraft.progressiveView.note === 'string' && rawDraft.progressiveView.note
          ? rawDraft.progressiveView.note
          : DEFAULT_PROGRESSIVE_VIEW.note
    };
    merged.progressiveView.bullets = normalizeBullets(
      rawDraft.progressiveView.bullets ?? merged.progressiveView.bullets
    );
  } else {
    merged.progressiveView = null;
  }

  if (rawDraft?.conservativeView) {
    merged.conservativeView = {
      ...DEFAULT_CONSERVATIVE_VIEW,
      ...(rawDraft.conservativeView || {}),
      note:
        typeof rawDraft.conservativeView.note === 'string' && rawDraft.conservativeView.note
          ? rawDraft.conservativeView.note
          : DEFAULT_CONSERVATIVE_VIEW.note
    };
    merged.conservativeView.bullets = normalizeBullets(
      rawDraft.conservativeView.bullets ?? merged.conservativeView.bullets
    );
  } else {
    merged.conservativeView = null;
  }

  if (rawDraft?.impactToLife) {
    merged.impactToLife = {
      ...DEFAULT_IMPACT,
      ...(rawDraft.impactToLife || {}),
      note:
        typeof rawDraft.impactToLife.note === 'string' && rawDraft.impactToLife.note
          ? rawDraft.impactToLife.note
          : DEFAULT_IMPACT.note
    };
  } else {
    merged.impactToLife = null;
  }

  return merged;
}

function sanitizePerspectiveForPreview(view) {
  if (!view || typeof view !== 'object') {
    return null;
  }
  const headline = typeof view.headline === 'string' ? view.headline.trim() : '';
  const bullets = sanitizeLinesForPreview(view.bullets);
  const intensity = typeof view.intensity === 'number' ? view.intensity : -1;
  const note = typeof view.note === 'string' ? view.note : '';

  if (!headline && bullets.length === 0) {
    return null;
  }

  const result = {
    headline,
    bullets
  };

  if (intensity >= 0) {
    result.intensity = Math.min(100, Math.max(0, intensity));
  }

  if (note) {
    result.note = note;
  }

  return result;
}

function sanitizeImpactForPreview(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }
  const text = typeof impact.text === 'string' ? impact.text.trim() : '';
  const note = typeof impact.note === 'string' ? impact.note : '';

  if (!text) {
    return null;
  }

  return note ? { text, note } : { text };
}

function sanitizeSourcesForPreview(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources
    .map((source, index) => ({
      id: `source-${index}`,
      type: typeof source?.type === 'string' && source.type ? source.type : 'etc',
      channelName: typeof source?.channelName === 'string' ? source.channelName.trim() : '',
      sourceDate: typeof source?.sourceDate === 'string' ? source.sourceDate.trim() : '',
      timestamp: typeof source?.timestamp === 'string' ? source.timestamp.trim() : '',
      note: typeof source?.note === 'string' ? source.note : ''
    }))
    .filter((source) => source.channelName.length > 0);
}

function AdminNewPage() {
  const [issueDraft, setIssueDraft] = useState(() => {
    if (typeof window === 'undefined') {
      return createInitialDraft();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const draftFromStorage = loadDraftFromJson(stored);
        return mergeDraftWithDefaults(draftFromStorage);
      }
    } catch (error) {
      console.warn('로컬 draft 로드 실패:', error);
    }

    return createInitialDraft();
  });
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [keyPointsText, setKeyPointsText] = useState(issueDraft.keyPoints.join('\n'));
  const [progressiveBulletsText, setProgressiveBulletsText] = useState(
    issueDraft.progressiveView ? issueDraft.progressiveView.bullets.join('\n') : ''
  );
  const [conservativeBulletsText, setConservativeBulletsText] = useState(
    issueDraft.conservativeView ? issueDraft.conservativeView.bullets.join('\n') : ''
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issueDraft));
    } catch (error) {
      console.warn('로컬 draft 저장 실패:', error);
    }
  }, [issueDraft]);

  useEffect(() => {
    setKeyPointsText(issueDraft.keyPoints.join('\n'));
  }, [issueDraft.keyPoints]);

  useEffect(() => {
    setProgressiveBulletsText(
      issueDraft.progressiveView ? issueDraft.progressiveView.bullets.join('\n') : ''
    );
  }, [issueDraft.progressiveView]);

  useEffect(() => {
    setConservativeBulletsText(
      issueDraft.conservativeView ? issueDraft.conservativeView.bullets.join('\n') : ''
    );
  }, [issueDraft.conservativeView]);

  const previewDraft = useMemo(() => {
    return {
      ...issueDraft,
      keyPoints: sanitizeLinesForPreview(issueDraft.keyPoints),
      progressiveView: sanitizePerspectiveForPreview(issueDraft.progressiveView),
      conservativeView: sanitizePerspectiveForPreview(issueDraft.conservativeView),
      impactToLife: sanitizeImpactForPreview(issueDraft.impactToLife),
      sources: sanitizeSourcesForPreview(issueDraft.sources)
    };
  }, [issueDraft]);

  const handleTopLevelChange = (field) => (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({
      ...prev,
      category: CATEGORY_OPTIONS.includes(value) ? value : prev.category
    }));
  };

  const handleKeyPointsChange = (value) => {
    setKeyPointsText(value);
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setIssueDraft((prev) => ({ ...prev, keyPoints: lines }));
  };

  const ensureViewSection = (key) => {
    setIssueDraft((prev) => {
      if (prev[key]) {
        return prev;
      }
      if (key === 'progressiveView') {
        return { ...prev, progressiveView: { ...DEFAULT_PROGRESSIVE_VIEW } };
      }
      if (key === 'conservativeView') {
        return { ...prev, conservativeView: { ...DEFAULT_CONSERVATIVE_VIEW } };
      }
      return prev;
    });
  };

  const removeViewSection = (key) => {
    setIssueDraft((prev) => ({ ...prev, [key]: null }));
    if (key === 'progressiveView') {
      setProgressiveBulletsText('');
    }
    if (key === 'conservativeView') {
      setConservativeBulletsText('');
    }
  };

  const handleViewFieldChange = (key, field, value) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      if (field === 'intensity') {
        if (value.trim() === '') {
          return { ...prev, [key]: { ...current, intensity: -1 } };
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          return prev;
        }
        if (numeric === -1) {
          return { ...prev, [key]: { ...current, intensity: -1 } };
        }
        const clamped = Math.min(100, Math.max(0, Math.round(numeric)));
        return { ...prev, [key]: { ...current, intensity: clamped } };
      }
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const handleViewBulletsChange = (key, value) => {
    if (key === 'progressiveView') {
      setProgressiveBulletsText(value);
    } else {
      setConservativeBulletsText(value);
    }
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return { ...prev, [key]: { ...current, bullets: lines } };
    });
  };

  const ensureImpactSection = () => {
    setIssueDraft((prev) => {
      if (prev.impactToLife) {
        return prev;
      }
      return { ...prev, impactToLife: { ...DEFAULT_IMPACT } };
    });
  };

  const removeImpactSection = () => {
    setIssueDraft((prev) => ({ ...prev, impactToLife: null }));
  };

  const handleImpactChange = (field, value) => {
    setIssueDraft((prev) => {
      if (!prev.impactToLife) {
        return prev;
      }
      return { ...prev, impactToLife: { ...prev.impactToLife, [field]: value } };
    });
  };

  const handleSourceChange = (index, field, value) => {
    setIssueDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      sources[index] = {
        ...sources[index],
        [field]: value
      };
      return { ...prev, sources };
    });
  };

  const addSource = () => {
    setIssueDraft((prev) => ({
      ...prev,
      sources: [...(Array.isArray(prev.sources) ? prev.sources : []), { ...DEFAULT_SOURCE }]
    }));
  };

  const removeSource = (index) => {
    setIssueDraft((prev) => {
      const sources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      sources.splice(index, 1);
      return { ...prev, sources };
    });
  };

  const resetDraftState = () => {
    const initial = createInitialDraft();
    setIssueDraft(initial);
    setJsonInput('');
    setJsonError('');
    setSubmitError('');
    setKeyPointsText('');
    setProgressiveBulletsText('');
    setConservativeBulletsText('');
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('로컬 draft 초기화 실패:', error);
      }
    }
  };

  const handleLoadJson = () => {
    try {
      const parsed = loadDraftFromJson(jsonInput);
      setIssueDraft(mergeDraftWithDefaults(parsed));
      setJsonError('');
    } catch (error) {
      const message = error?.message || 'JSON.parse 실행 중 알 수 없는 오류가 발생했습니다.';
      setJsonError(`❌ JSON 형식 오류: ${message}. 문자열 내 줄바꿈(엔터) 제거 후 다시 요청 필요.`);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');

    if (!issueDraft.title.trim()) {
      setSubmitError('제목을 입력해 주세요.');
      return;
    }
    if (!issueDraft.date.trim()) {
      setSubmitError('날짜를 입력해 주세요. (예: 2024-05-01 또는 "정보 부족")');
      return;
    }
    if (!issueDraft.summaryCard.trim()) {
      setSubmitError('홈 요약(summaryCard)을 입력해 주세요.');
      return;
    }
    if (!issueDraft.background.trim()) {
      setSubmitError('배경 설명을 입력해 주세요.');
      return;
    }
    if (!Array.isArray(issueDraft.keyPoints) || issueDraft.keyPoints.length === 0) {
      setSubmitError('핵심 bullet을 최소 1개 이상 입력해 주세요.');
      return;
    }
    if (!Array.isArray(issueDraft.sources) || issueDraft.sources.length === 0) {
      setSubmitError('출처를 최소 1개 이상 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueDraft)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '등록 중 오류가 발생했습니다.');
      }

      window.alert('등록 완료');
      resetDraftState();
    } catch (error) {
      console.error('등록 실패:', error);
      setSubmitError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">새 이슈 등록</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            AI가 생성한 JSON을 붙여넣고 불러오거나, 아래 폼을 직접 작성해 이슈를 등록하세요.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI JSON 불러오기</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                AI가 반환한 JSON 전체를 붙여넣고 “불러오기” 버튼을 누르면 issueDraft 구조에 맞춰 자동으로 채워집니다.
                JSON 구문 오류가 있으면 자동으로 고쳐주지 않으므로, 에러 메시지를 확인한 뒤 프롬프트를 다시 실행해야 합니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                className="mt-4 min-h-[160px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder='예) {"title":"...","date":"2024-01-01",...}'
              />
              {jsonError ? (
                <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                  {jsonError}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLoadJson}
                  className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  불러오기
                </button>
                <button
                  type="button"
                  onClick={resetDraftState}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  초기화
                </button>
              </div>
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">기본 정보</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">제목</span>
                  <input
                    type="text"
                    value={issueDraft.title}
                    onChange={handleTopLevelChange('title')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="기사/이슈 제목"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">발생일</span>
                  <input
                    type="text"
                    value={issueDraft.date}
                    onChange={handleTopLevelChange('date')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="YYYY-MM-DD 또는 정보 부족"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">카테고리</span>
                  <select
                    value={issueDraft.category}
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
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">홈 요약(summaryCard)</span>
                  <input
                    type="text"
                    value={issueDraft.summaryCard}
                    onChange={handleTopLevelChange('summaryCard')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="한 줄 요약"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">배경 설명</span>
                <textarea
                  value={issueDraft.background}
                  onChange={handleTopLevelChange('background')}
                  className="min-h-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="배경을 2~3단락으로 정리하세요. 단락 사이에는 빈 줄을 넣어 주세요."
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">핵심 포인트 (줄바꿈으로 bullet 나눔)</span>
                <textarea
                  value={keyPointsText}
                  onChange={(event) => handleKeyPointsChange(event.target.value)}
                  className="min-h-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder={`예\n- 정부 정책 발표\n- 시장 반응 요약`}
                />
              </label>
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">진보 시각</h2>
                {issueDraft.progressiveView ? (
                  <button
                    type="button"
                    onClick={() => removeViewSection('progressiveView')}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensureViewSection('progressiveView')}
                    className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>
              {issueDraft.progressiveView ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={issueDraft.progressiveView.headline}
                      onChange={(event) =>
                        handleViewFieldChange('progressiveView', 'headline', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="진보 진영의 핵심 주장"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">bullet (줄바꿈으로 나눔)</span>
                    <textarea
                      value={progressiveBulletsText}
                      onChange={(event) =>
                        handleViewBulletsChange('progressiveView', event.target.value)
                      }
                      className="min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={`예\n- 주장 1\n- 주장 2`}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100, 빈 칸이면 -1)</span>
                    <input
                      type="number"
                      min="-1"
                      max="100"
                      value={
                        issueDraft.progressiveView.intensity === -1
                          ? ''
                          : issueDraft.progressiveView.intensity
                      }
                      onChange={(event) =>
                        handleViewFieldChange('progressiveView', 'intensity', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.progressiveView.note}
                      onChange={(event) =>
                        handleViewFieldChange('progressiveView', 'note', event.target.value)
                      }
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">보수 시각</h2>
                {issueDraft.conservativeView ? (
                  <button
                    type="button"
                    onClick={() => removeViewSection('conservativeView')}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ensureViewSection('conservativeView')}
                    className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>
              {issueDraft.conservativeView ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">헤드라인</span>
                    <input
                      type="text"
                      value={issueDraft.conservativeView.headline}
                      onChange={(event) =>
                        handleViewFieldChange('conservativeView', 'headline', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="보수 진영의 핵심 주장"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">bullet (줄바꿈으로 나눔)</span>
                    <textarea
                      value={conservativeBulletsText}
                      onChange={(event) =>
                        handleViewBulletsChange('conservativeView', event.target.value)
                      }
                      className="min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={`예\n- 주장 1\n- 주장 2`}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">주장 강도 (0~100, 빈 칸이면 -1)</span>
                    <input
                      type="number"
                      min="-1"
                      max="100"
                      value={
                        issueDraft.conservativeView.intensity === -1
                          ? ''
                          : issueDraft.conservativeView.intensity
                      }
                      onChange={(event) =>
                        handleViewFieldChange('conservativeView', 'intensity', event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.conservativeView.note}
                      onChange={(event) =>
                        handleViewFieldChange('conservativeView', 'note', event.target.value)
                      }
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">이게 내 삶에 뭐가 변함?</h2>
                {issueDraft.impactToLife ? (
                  <button
                    type="button"
                    onClick={removeImpactSection}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10"
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
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">본문</span>
                    <textarea
                      value={issueDraft.impactToLife.text}
                      onChange={(event) => handleImpactChange('text', event.target.value)}
                      className="min-h-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="중립적 해석과 체감 영향을 요약하세요."
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">note</span>
                    <textarea
                      value={issueDraft.impactToLife.note}
                      onChange={(event) => handleImpactChange('note', event.target.value)}
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">출처</h2>
                <button
                  type="button"
                  onClick={addSource}
                  className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  출처 추가
                </button>
              </div>
              {issueDraft.sources.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  최소 1개 이상의 출처를 입력해 주세요.
                </p>
              ) : null}
              <div className="space-y-6">
                {issueDraft.sources.map((source, index) => (
                  <div
                    key={`source-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        출처 {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs">
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
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">채널명/언론사</span>
                        <input
                          type="text"
                          value={source.channelName}
                          onChange={(event) => handleSourceChange(index, 'channelName', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="예: YTN"
                        />
                      </label>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">보도/업로드 날짜</span>
                        <input
                          type="text"
                          value={source.sourceDate}
                          onChange={(event) => handleSourceChange(index, 'sourceDate', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="YYYY-MM-DD 또는 정보 부족"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">타임스탬프 (선택)</span>
                        <input
                          type="text"
                          value={source.timestamp}
                          onChange={(event) => handleSourceChange(index, 'timestamp', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="예: 12:30"
                        />
                      </label>
                    </div>
                    <label className="mt-4 flex flex-col gap-2 text-xs">
                      <span className="font-medium">비고</span>
                      <textarea
                        value={source.note}
                        onChange={(event) => handleSourceChange(index, 'note', event.target.value)}
                        className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">등록하기</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    TODO: 실제 운영 시 관리자 인증(x-admin-secret 등) 검증을 추가해야 합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
              {submitError ? (
                <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{submitError}</p>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">실시간 미리보기</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                왼쪽에서 입력한 내용이 issueDraft 구조 그대로 렌더링됩니다. bullet 배열은 &lt;ul&gt; 요소로 표시됩니다.
              </p>
            </div>

            <div className="space-y-5">
              <SectionCard title="요약" badgeText={issueDraft.category} tone="neutral">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {previewDraft.title || '제목을 입력하면 이곳에 표시됩니다.'}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{previewDraft.date}</p>
                <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
                  {previewDraft.summaryCard || '홈 요약을 입력하면 간략 소개가 노출됩니다.'}
                </p>
              </SectionCard>

              <SectionCard title="배경" tone="neutral">
                {splitParagraphs(previewDraft.background).length > 0 ? (
                  splitParagraphs(previewDraft.background).map((paragraph, index) => (
                    <p key={`bg-${index}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">배경 설명을 입력하면 단락 형태로 보여집니다.</p>
                )}
              </SectionCard>

              <SectionCard title="핵심 포인트" badgeText="정리" tone="neutral">
                {previewDraft.keyPoints.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
                    {previewDraft.keyPoints.map((point, index) => (
                      <li key={`kp-${index}`}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">bullet을 입력하면 순서 없는 목록으로 정리됩니다.</p>
                )}
              </SectionCard>

              {previewDraft.progressiveView ? (
                <SectionCard title="진보 시각" badgeText="관점" tone="progressive">
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                    {previewDraft.progressiveView.headline}
                  </h3>
                  {previewDraft.progressiveView.intensity !== undefined ? (
                    <div className="mt-3">
                      <IntensityBar
                        value={previewDraft.progressiveView.intensity}
                        label="주장 강도"
                        colorClass="bg-emerald-500"
                      />
                    </div>
                  ) : null}
                  {previewDraft.progressiveView.bullets.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-emerald-900 dark:text-emerald-100">
                      {previewDraft.progressiveView.bullets.map((bullet, index) => (
                        <li key={`progressive-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {previewDraft.progressiveView.note ? (
                    <p className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-100/80">
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
                    <div className="mt-3">
                      <IntensityBar
                        value={previewDraft.conservativeView.intensity}
                        label="주장 강도"
                        colorClass="bg-rose-500"
                      />
                    </div>
                  ) : null}
                  {previewDraft.conservativeView.bullets.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-rose-900 dark:text-rose-100">
                      {previewDraft.conservativeView.bullets.map((bullet, index) => (
                        <li key={`conservative-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {previewDraft.conservativeView.note ? (
                    <p className="mt-3 text-xs text-rose-900/80 dark:text-rose-100/80">
                      {previewDraft.conservativeView.note}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              {previewDraft.impactToLife ? (
                <SectionCard title="이게 내 삶에 뭐가 변함?" badgeText="중립" tone="impact">
                  <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
                    {previewDraft.impactToLife.text}
                  </p>
                  {previewDraft.impactToLife.note ? (
                    <p className="mt-3 text-xs text-indigo-900/80 dark:text-indigo-100/80">
                      {previewDraft.impactToLife.note}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              <SectionCard title="출처" badgeText="근거" tone="neutral">
                {previewDraft.sources.length > 0 ? (
                  <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
                    {previewDraft.sources.map((source) => (
                      <div key={source.id} className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                          <span>{source.channelName}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            {source.type}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                          <span>{source.sourceDate || '정보 부족'}</span>
                          {source.timestamp ? <span>· {source.timestamp}</span> : null}
                        </div>
                        {source.note ? (
                          <p className="mt-2 text-slate-600 dark:text-slate-300">{source.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">출처를 입력하면 목록이 카드 형태로 표시됩니다.</p>
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
