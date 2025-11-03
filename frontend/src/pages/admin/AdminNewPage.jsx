// frontend/src/pages/admin/AdminNewPage.jsx
// 이 페이지는 완전히 클라이언트 사이드에서 Firestore Web SDK를 사용해 새 문서를 생성한다.
// 현재 누구나 /admin/new 에 접근하면 issues 컬렉션에 글을 추가할 수 있다. TODO: 프로덕션 단계에서는 접근 제한과 Firestore 보안 규칙 강화를 반드시 적용해야 한다.

import { useEffect, useMemo, useRef, useState } from 'react';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import LifestyleThemeEditor from '../../components/admin/LifestyleThemeEditor.jsx';
import LifestyleThemePreview from '../../components/admin/LifestyleThemePreview.jsx';
import ParentingThemeEditor from '../../components/admin/ParentingThemeEditor.jsx';
import ParentingThemePreview from '../../components/admin/ParentingThemePreview.jsx';
import HealthThemeEditor from '../../components/admin/HealthThemeEditor.jsx';
import HealthThemePreview from '../../components/admin/HealthThemePreview.jsx';
import StockThemeEditor from '../../components/admin/StockThemeEditor.jsx';
import StockThemePreview from '../../components/admin/StockThemePreview.jsx';
import {
  getCategoryOptions,
  getDefaultCategory,
  getSubcategoryOptions,
  isValidCategory,
  isValidSubcategory
} from '../../constants/categoryStructure.js';
import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from '../../constants/themeConfig.js';
import { createIssue } from '../../firebaseClient.js';
import { getThemePrompt } from '../../constants/themePrompts.js';
import { createFreshDraft, ensureThemeGuides } from '../../utils/emptyDraft.js';
import {
  createHealthGuide,
  createLifestyleGuide,
  createParentingGuide
} from '../../utils/themeDraftDefaults.js';
import { loadDraftFromJson } from '../../utils/loadDraftFromJson.js';

const STORAGE_KEY = 'adminDraftV6';
const SOURCE_TYPE_OPTIONS = [
  { value: 'official', label: '공식 발표' },
  { value: 'youtube', label: '유튜브' },
  { value: 'media', label: '언론/매체' },
  { value: 'etc', label: '기타' }
];

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보측 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function restoreDraftFromStorage() {
  if (typeof window === 'undefined') {
    return createFreshDraft();
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createFreshDraft();
    }
    return ensureThemeGuides(loadDraftFromJson(stored));
  } catch (error) {
    console.warn('로컬 스토리지 초안 복구 실패:', error);
    return createFreshDraft();
  }
}

function sanitizeJsonNewlines(rawText) {
  if (typeof rawText !== 'string' || rawText.length === 0) {
    return rawText || '';
  }

  let sanitized = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (escaped) {
      sanitized += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      sanitized += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      sanitized += char;
      continue;
    }

    if (inString && (char === '\n' || char === '\r')) {
      continue;
    }

    sanitized += char;
  }

  return sanitized;
}

function parseDraftFromJson(jsonText) {
  const parsed = loadDraftFromJson(jsonText);
  if (!isValidThemeId(parsed.theme)) {
    parsed.theme = DEFAULT_THEME_ID;
  }
  return ensureThemeGuides(parsed);
}

function AdminNewPage() {
  const [issueDraft, setIssueDraft] = useState(() => restoreDraftFromStorage());
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptCopyFeedback, setPromptCopyFeedback] = useState('');
  const copyTimeoutRef = useRef(null);

  const categoryValue = issueDraft.category;
  const subcategoryValue = issueDraft.subcategory;
  const selectedTheme = issueDraft.theme && isValidThemeId(issueDraft.theme) ? issueDraft.theme : DEFAULT_THEME_ID;
  const themeMeta = THEME_CONFIG.find((item) => item.id === selectedTheme) ?? THEME_CONFIG[0];
  const themePrompt = getThemePrompt(selectedTheme);
  const isClipboardSupported = typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
  const isCopyError = promptCopyFeedback.startsWith('복사 실패');
  const showPerspectiveSections = themeMeta?.showPerspectives ?? false;
  const isJsonAdjustRecommended = jsonError.includes('Bad control character');

  const categoryOptions = useMemo(() => getCategoryOptions(selectedTheme), [selectedTheme]);
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptions(selectedTheme, categoryValue),
    [categoryValue, selectedTheme]
  );

  useEffect(() => {
    if (categoryOptions.length === 0) {
      if (categoryValue !== '' || subcategoryValue !== '') {
        setIssueDraft((prev) => {
          if (prev.category === '' && prev.subcategory === '') {
            return prev;
          }
          return {
            ...prev,
            category: '',
            subcategory: ''
          };
        });
      }
      return;
    }

    if (categoryOptions.includes(categoryValue)) {
      return;
    }

    const fallbackCategory = categoryOptions[0];
    setIssueDraft((prev) => {
      if (prev.category === fallbackCategory && prev.subcategory === '') {
        return prev;
      }
      return {
        ...prev,
        category: fallbackCategory,
        subcategory: ''
      };
    });
  }, [categoryOptions, categoryValue, subcategoryValue]);

  useEffect(() => {
    if (subcategoryValue && !subcategoryOptions.includes(subcategoryValue)) {
      setIssueDraft((prev) => ({ ...prev, subcategory: '' }));
    }
  }, [subcategoryValue, subcategoryOptions]);

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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setPromptCopyFeedback('');
  }, [selectedTheme]);

  const previewBackground = useMemo(() => {
    if (!issueDraft.background) {
      return [];
    }
    return issueDraft.background
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [issueDraft.background]);

  const previewKeyPoints = useMemo(() => {
    if (!Array.isArray(issueDraft.keyPoints)) {
      return [];
    }
    return issueDraft.keyPoints
      .map((point) => (typeof point === 'string' ? point : String(point ?? '')))
      .filter((point) => point.trim().length > 0);
  }, [issueDraft.keyPoints]);

  const previewSources = useMemo(() => {
    if (!Array.isArray(issueDraft.sources)) {
      return [];
    }
    return issueDraft.sources.map((source, index) => ({
      id: `${index}-${source?.channelName ?? 'source'}`,
      type: source?.type ?? 'etc',
      channelName: source?.channelName ?? '',
      sourceDate: source?.sourceDate ?? '',
      timestamp: source?.timestamp ?? '',
      note: source?.note ?? ''
    }));
  }, [issueDraft.sources]);

  const handleLoadJson = () => {
    try {
      const draft = parseDraftFromJson(jsonInput);
      setIssueDraft(draft);
      setJsonError('');
      setSubmitError('');
    } catch (error) {
      setJsonError(`❌ JSON 파싱 오류: ${error.message}`);
    }
  };

  const handleAdjustJson = () => {
    if (typeof jsonInput !== 'string' || jsonInput.trim().length === 0) {
      return;
    }

    const sanitized = sanitizeJsonNewlines(jsonInput);
    setJsonInput(sanitized);

    try {
      const draft = parseDraftFromJson(sanitized);
      setIssueDraft(draft);
      setJsonError('');
      setSubmitError('');
    } catch (error) {
      setJsonError(`❌ JSON 파싱 오류: ${error.message}`);
    }
  };

  const handleCopyPrompt = async () => {
    if (!themePrompt) {
      return;
    }
    if (!isClipboardSupported) {
      setPromptCopyFeedback('복사 실패: 브라우저가 클립보드를 지원하지 않습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(themePrompt);
      setPromptCopyFeedback('프롬프트를 복사했어요.');
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setPromptCopyFeedback('');
        copyTimeoutRef.current = null;
      }, 2500);
    } catch (error) {
      console.error('프롬프트 복사 실패:', error);
      setPromptCopyFeedback('복사 실패: 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEasySummaryChange = (event) => {
    const value = event.target.value.replace(/\n+/g, ' ').trimStart();
    setIssueDraft((prev) => ({ ...prev, easySummary: value }));
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => {
      const nextCategory = isValidCategory(selectedTheme, value) ? value : prev.category;
      const allowedSubcategories = getSubcategoryOptions(selectedTheme, nextCategory);
      const nextSubcategory = allowedSubcategories.includes(prev.subcategory) ? prev.subcategory : '';
      return {
        ...prev,
        category: nextCategory,
        subcategory: nextSubcategory
      };
    });
  };

  const handleSubcategoryChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({
      ...prev,
      subcategory: isValidSubcategory(selectedTheme, prev.category, value) ? value : ''
    }));
  };

  const handleThemeChange = (event) => {
    const { value } = event.target;
    const nextTheme = isValidThemeId(value) ? value : DEFAULT_THEME_ID;
    setIssueDraft((prev) => {
      const base = ensureThemeGuides(prev);
      const nextThemeMeta = THEME_CONFIG.find((item) => item.id === nextTheme);
      const draft = {
        ...base,
        theme: nextTheme,
        parentingGuide: base.parentingGuide ?? createParentingGuide(),
        healthGuide: base.healthGuide ?? createHealthGuide(),
        lifestyleGuide: base.lifestyleGuide ?? createLifestyleGuide()
      };
      const defaultCategory = getDefaultCategory(nextTheme);
      draft.category = isValidCategory(nextTheme, base.category) ? base.category : defaultCategory;
      const allowedSubcategories = getSubcategoryOptions(nextTheme, draft.category);
      draft.subcategory = allowedSubcategories.includes(base.subcategory) ? base.subcategory : '';
      if (!nextThemeMeta?.showPerspectives) {
        draft.progressiveView = null;
        draft.conservativeView = null;
      }
      return draft;
    });
  };

  const handleParentingGuideChange = (nextGuide) => {
    setIssueDraft((prev) => ({ ...prev, parentingGuide: nextGuide }));
  };

  const handleHealthGuideChange = (nextGuide) => {
    setIssueDraft((prev) => ({ ...prev, healthGuide: nextGuide }));
  };

  const handleLifestyleGuideChange = (nextGuide) => {
    setIssueDraft((prev) => ({ ...prev, lifestyleGuide: nextGuide }));
  };

  const handleStockGuideChange = (nextGuide) => {
    setIssueDraft((prev) => ({ ...prev, stockGuide: nextGuide }));
  };

  const addKeyPoint = () => {
    setIssueDraft((prev) => ({
      ...prev,
      keyPoints: [...(Array.isArray(prev.keyPoints) ? prev.keyPoints : []), '']
    }));
  };

  const updateKeyPoint = (index, value) => {
    setIssueDraft((prev) => {
      const points = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      points[index] = value;
      return { ...prev, keyPoints: points };
    });
  };

  const removeKeyPoint = (index) => {
    setIssueDraft((prev) => {
      const points = Array.isArray(prev.keyPoints) ? [...prev.keyPoints] : [];
      points.splice(index, 1);
      return { ...prev, keyPoints: points };
    });
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
  };

  const removePerspective = (key) => {
    setIssueDraft((prev) => ({
      ...prev,
      [key]: null
    }));
  };

  const updatePerspectiveField = (key, field, value) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      if (field === 'intensity') {
        if (value === '') {
          return { ...prev, [key]: { ...current, intensity: -1 } };
        }
        const numeric = Number(value);
        const safe = Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : -1;
        return { ...prev, [key]: { ...current, intensity: safe } };
      }
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const updatePerspectiveBullet = (key, index, value) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets] : [];
      bullets[index] = value;
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const addPerspectiveBullet = (key) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets, ''] : [''];
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const removePerspectiveBullet = (key, index) => {
    setIssueDraft((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const bullets = Array.isArray(current.bullets) ? [...current.bullets] : [];
      bullets.splice(index, 1);
      return { ...prev, [key]: { ...current, bullets } };
    });
  };

  const ensureImpact = () => {
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
  };

  const removeImpact = () => {
    setIssueDraft((prev) => ({
      ...prev,
      impactToLife: null
    }));
  };

  const updateImpactField = (field, value) => {
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
  };

  const updateSource = (index, field, value) => {
    setIssueDraft((prev) => {
      const nextSources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      const target = nextSources[index] ?? {
        type: 'official',
        channelName: '',
        sourceDate: '',
        timestamp: '',
        note: ''
      };
      nextSources[index] = { ...target, [field]: value };
      return { ...prev, sources: nextSources };
    });
  };

  const removeSource = (index) => {
    setIssueDraft((prev) => {
      const nextSources = Array.isArray(prev.sources) ? [...prev.sources] : [];
      nextSources.splice(index, 1);
      return { ...prev, sources: nextSources };
    });
  };

  const resetDraft = () => {
    const fresh = createFreshDraft();
    setIssueDraft(fresh);
    setJsonInput('');
    setJsonError('');
    setSubmitError('');
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
    setIsSubmitting(true);
    try {
      const payload = {
        ...issueDraft,
        theme: selectedTheme,
        progressiveView: showPerspectiveSections ? issueDraft.progressiveView : null,
        conservativeView: showPerspectiveSections ? issueDraft.conservativeView : null,
        parentingGuide: selectedTheme === 'parenting' ? issueDraft.parentingGuide : null,
        healthGuide: selectedTheme === 'health' ? issueDraft.healthGuide : null,
        lifestyleGuide: selectedTheme === 'lifestyle' ? issueDraft.lifestyleGuide : null,
        stockGuide: selectedTheme === 'stocks' ? issueDraft.stockGuide : null
      };
      const newId = await createIssue(payload);
      window.alert('등록 완료');
      console.info('새 문서 ID:', newId);
      resetDraft();
    } catch (error) {
      console.error('Firestore 등록 실패:', error);
      setSubmitError(error?.message || '등록 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-500">infoall · Admin</p>
          <h1 className="text-3xl font-extrabold">새 게시물 등록</h1>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold">테마 선택</h2>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">테마</span>
            <select
              value={selectedTheme}
              onChange={handleThemeChange}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {THEME_CONFIG.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">{themeMeta?.description}</span>
            {Array.isArray(themeMeta?.keyAreas) && themeMeta.keyAreas.length > 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                세부 영역: {themeMeta.keyAreas.join(' · ')}
              </span>
            ) : null}
          </label>
        </section>

        {themePrompt && (
          <section className="space-y-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-6 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">선택한 테마 프롬프트</h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-200/80">
                  버튼을 누르면 {themeMeta?.label ?? '테마'}용 프롬프트가 복사됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyPrompt}
                disabled={!isClipboardSupported}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isClipboardSupported
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                    : 'cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                프롬프트 복사
              </button>
            </div>
            {promptCopyFeedback && (
              <p
                className={`text-xs font-semibold ${
                  isCopyError
                    ? 'text-rose-600 dark:text-rose-300'
                    : 'text-emerald-700 dark:text-emerald-200'
                }`}
              >
                {promptCopyFeedback}
              </p>
            )}
          </section>
        )}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold">AI JSON 붙여넣기</h2>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder='{"easySummary":"...","title":"..."}'
            className="min-h-[160px] w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={handleLoadJson}
              className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              불러오기
            </button>
            <button
              type="button"
              onClick={handleAdjustJson}
              disabled={jsonInput.trim().length === 0}
              className={`inline-flex items-center rounded-lg px-4 py-2 font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                jsonInput.trim().length === 0
                  ? 'cursor-not-allowed border border-amber-200 text-amber-300 dark:border-amber-500/30 dark:text-amber-400/50'
                  : isJsonAdjustRecommended
                    ? 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600'
                    : 'border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-300 dark:hover:bg-amber-500/10'
              }`}
            >
              조정하기
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              초기화
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JSON은 한 줄 문자열이어야 합니다. 오류가 난다면 조정하기 버튼으로 줄바꿈을 제거해 보세요.
            </p>
          </div>
          {jsonError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
              {jsonError}
            </p>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">기본 정보</h2>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">쉬운 요약 (일반인 설명용)</span>
                <textarea
                  value={issueDraft.easySummary}
                  onChange={handleEasySummaryChange}
                  className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="한 줄로 핵심을 설명해 주세요."
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">제목</span>
                <input
                  type="text"
                  value={issueDraft.title}
                  onChange={handleFieldChange('title')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">날짜</span>
                  <input
                    type="text"
                    value={issueDraft.date}
                    onChange={handleFieldChange('date')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="YYYY-MM-DD 또는 정보 부족"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">카테고리</span>
                  <select
                    value={issueDraft.category}
                    onChange={handleCategoryChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {categoryOptions.length === 0 ? (
                      <option value="">카테고리 없음</option>
                    ) : (
                      categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">하위 카테고리</span>
                  <select
                    value={issueDraft.subcategory}
                    onChange={handleSubcategoryChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">하위 카테고리 선택</option>
                    {subcategoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">요약 카드 문장</span>
                <textarea
                  value={issueDraft.summaryCard}
                  onChange={handleFieldChange('summaryCard')}
                  className="min-h-[100px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="메인 카드에 노출할 1~2문장"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">배경 설명</span>
                <textarea
                  value={issueDraft.background}
                  onChange={handleFieldChange('background')}
                  className="min-h-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="사건 경과, 핵심 쟁점 등을 자유롭게 정리합니다."
                />
              </label>
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
                      onChange={(event) => updateKeyPoint(index, event.target.value)}
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

          {selectedTheme === 'parenting' ? (
            <ParentingThemeEditor
              guide={issueDraft.parentingGuide}
              onChange={handleParentingGuideChange}
            />
          ) : null}

          {selectedTheme === 'health' ? (
            <HealthThemeEditor guide={issueDraft.healthGuide} onChange={handleHealthGuideChange} />
          ) : null}

          {selectedTheme === 'lifestyle' ? (
            <LifestyleThemeEditor guide={issueDraft.lifestyleGuide} onChange={handleLifestyleGuideChange} />
          ) : null}

          {selectedTheme === 'stocks' ? (
            <StockThemeEditor guide={issueDraft.stockGuide} onChange={handleStockGuideChange} />
          ) : null}

          {showPerspectiveSections ? (
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
                      onChange={(event) => updatePerspectiveField('progressiveView', 'headline', event.target.value)}
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
                          onChange={(event) => updatePerspectiveBullet('progressiveView', index, event.target.value)}
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
                    <span className="font-medium">강도 (0~100 또는 비워두면 -1)</span>
                    <input
                      type="number"
                      value={issueDraft.progressiveView.intensity >= 0 ? issueDraft.progressiveView.intensity : ''}
                      onChange={(event) => updatePerspectiveField('progressiveView', 'intensity', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      min="0"
                      max="100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">노트</span>
                    <textarea
                      value={issueDraft.progressiveView.note}
                      onChange={(event) => updatePerspectiveField('progressiveView', 'note', event.target.value)}
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              ) : null}
              </section>
            ) : null}

            {showPerspectiveSections ? (
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
                      onChange={(event) => updatePerspectiveField('conservativeView', 'headline', event.target.value)}
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
                          onChange={(event) => updatePerspectiveBullet('conservativeView', index, event.target.value)}
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
                    <span className="font-medium">강도 (0~100 또는 비워두면 -1)</span>
                    <input
                      type="number"
                      value={issueDraft.conservativeView.intensity >= 0 ? issueDraft.conservativeView.intensity : ''}
                      onChange={(event) => updatePerspectiveField('conservativeView', 'intensity', event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      min="0"
                      max="100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">노트</span>
                    <textarea
                      value={issueDraft.conservativeView.note}
                      onChange={(event) => updatePerspectiveField('conservativeView', 'note', event.target.value)}
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              ) : null}
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                선택한 테마에서는 진보/보수 비교 섹션을 사용하지 않습니다. 필요하면 테마를 "사건/정책"으로 변경해 두 시각을 입력하세요.
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">생활 체감 영향</h2>
                {issueDraft.impactToLife ? (
                  <button
                    type="button"
                    onClick={removeImpact}
                    className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                  >
                    섹션 제거
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={ensureImpact}
                    className="inline-flex items-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    섹션 추가
                  </button>
                )}
              </div>

              {issueDraft.impactToLife ? (
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">본문</span>
                    <textarea
                      value={issueDraft.impactToLife.text}
                      onChange={(event) => updateImpactField('text', event.target.value)}
                      className="min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">노트</span>
                    <textarea
                      value={issueDraft.impactToLife.note}
                      onChange={(event) => updateImpactField('note', event.target.value)}
                      className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  출처 추가
                </button>
              </div>
              <div className="space-y-4">
                {issueDraft.sources.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    출처를 추가해 근거를 명시하세요.
                  </p>
                ) : null}
                {issueDraft.sources.map((source, index) => (
                  <div key={`source-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>출처 #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSource(index)}
                        className="inline-flex items-center rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/60 dark:hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">타입</span>
                        <select
                          value={source.type}
                          onChange={(event) => updateSource(index, 'type', event.target.value)}
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
                        <span className="font-medium">채널명/언론명</span>
                        <input
                          type="text"
                          value={source.channelName}
                          onChange={(event) => updateSource(index, 'channelName', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">발행일</span>
                        <input
                          type="text"
                          value={source.sourceDate}
                          onChange={(event) => updateSource(index, 'sourceDate', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="YYYY-MM-DD 또는 정보 부족"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-xs">
                        <span className="font-medium">타임스탬프</span>
                        <input
                          type="text"
                          value={source.timestamp}
                          onChange={(event) => updateSource(index, 'timestamp', event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="12:30 형식 또는 비워두기"
                        />
                      </label>
                    </div>
                    <label className="mt-3 flex flex-col gap-2 text-xs">
                      <span className="font-medium">한 줄 요약</span>
                      <textarea
                        value={source.note}
                        onChange={(event) => updateSource(index, 'note', event.target.value)}
                        className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {submitError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
                {submitError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? 'Firestore에 등록 중...' : '등록하기'}
            </button>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold">미리보기</h2>
              <dl className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">테마</dt>
                  <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">{themeMeta?.label}</dd>
                </div>
                {Array.isArray(themeMeta?.keyAreas) && themeMeta.keyAreas.length > 0 ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-medium text-slate-500 dark:text-slate-400">세부 영역</dt>
                    <dd className="text-right text-xs text-slate-600 dark:text-slate-300">
                      {themeMeta.keyAreas.join(' · ')}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">카테고리</dt>
                  <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">
                    {issueDraft.category || '미선택'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">하위 카테고리</dt>
                  <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">
                    {issueDraft.subcategory || '미선택'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">날짜</dt>
                  <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">
                    {issueDraft.date || '정보 부족'}
                  </dd>
                </div>
              </dl>
            </div>

            {issueDraft.easySummary && (
              <SectionCard title="쉬운 요약" tone="neutral">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{issueDraft.easySummary}</p>
              </SectionCard>
            )}

            <SectionCard title="무슨 일이 있었나요?" tone="neutral">
              {previewBackground.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {previewBackground.map((paragraph, index) => (
                    <li key={`bg-${index}`}>{paragraph}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">배경 설명이 비어 있습니다.</p>
              )}
            </SectionCard>

            <SectionCard title="핵심 쟁점" tone="neutral">
              {previewKeyPoints.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {previewKeyPoints.map((point, index) => (
                    <li key={`preview-key-${index}`}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">핵심 bullet을 입력하면 여기에 표시됩니다.</p>
              )}
            </SectionCard>

            {selectedTheme === 'parenting' ? (
              <ParentingThemePreview guide={issueDraft.parentingGuide} />
            ) : null}

            {selectedTheme === 'health' ? (
              <HealthThemePreview guide={issueDraft.healthGuide} />
            ) : null}

            {selectedTheme === 'lifestyle' ? (
              <LifestyleThemePreview guide={issueDraft.lifestyleGuide} />
            ) : null}

            {selectedTheme === 'stocks' ? (
              <StockThemePreview guide={issueDraft.stockGuide} />
            ) : null}

            {issueDraft.progressiveView ? (
              <SectionCard title="진보 시각" tone="progressive" badgeText="진보">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{issueDraft.progressiveView.headline}</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{issueDraft.progressiveView.note}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-emerald-900 dark:text-emerald-100">
                  {issueDraft.progressiveView.bullets.map((bullet, index) => (
                    <li key={`preview-prog-${index}`}>{bullet}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <IntensityBar intensity={issueDraft.progressiveView.intensity} />
                </div>
              </SectionCard>
            ) : null}

            {issueDraft.conservativeView ? (
              <SectionCard title="보수 시각" tone="conservative" badgeText="보수">
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">{issueDraft.conservativeView.headline}</p>
                <p className="text-xs text-rose-700/80 dark:text-rose-200/80">{issueDraft.conservativeView.note}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rose-900 dark:text-rose-100">
                  {issueDraft.conservativeView.bullets.map((bullet, index) => (
                    <li key={`preview-cons-${index}`}>{bullet}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <IntensityBar intensity={issueDraft.conservativeView.intensity} />
                </div>
              </SectionCard>
            ) : null}

            {issueDraft.impactToLife ? (
              <SectionCard title="생활 영향" tone="impact" badgeText="체감">
                <p className="text-sm text-slate-700 dark:text-slate-200">{issueDraft.impactToLife.text}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{issueDraft.impactToLife.note}</p>
              </SectionCard>
            ) : null}

            <SectionCard title="출처" tone="neutral">
              {previewSources.length > 0 ? (
                <ul className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {previewSources.map((source) => (
                    <li key={source.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-slate-600 dark:bg-slate-900/40">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{source.channelName || '출처 미상'}</p>
                      <p className="text-[11px] uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{source.type}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        날짜: {source.sourceDate || '정보 부족'} {source.timestamp ? `· ${source.timestamp}` : ''}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{source.note || '설명이 없습니다.'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">출처가 아직 없습니다.</p>
              )}
            </SectionCard>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default AdminNewPage;
