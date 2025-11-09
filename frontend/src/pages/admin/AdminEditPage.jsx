// frontend/src/pages/admin/AdminEditPage.jsx
// Firestore Web SDK로 직접 문서를 읽어와 수정/삭제한다. Render 백엔드를 전혀 호출하지 않는다.
// 현재 누구나 /admin/edit/:id 에 접근하면 문서를 수정하거나 삭제할 수 있다. TODO: 프로덕션에서는 접근 제한과 보안 규칙 강화를 반드시 수행해야 한다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import HealthThemeEditor from '../../components/admin/HealthThemeEditor.jsx';
import HealthThemePreview from '../../components/admin/HealthThemePreview.jsx';
import LifestyleThemeEditor from '../../components/admin/LifestyleThemeEditor.jsx';
import LifestyleThemePreview from '../../components/admin/LifestyleThemePreview.jsx';
import ParentingThemeEditor from '../../components/admin/ParentingThemeEditor.jsx';
import ParentingThemePreview from '../../components/admin/ParentingThemePreview.jsx';
import StockThemeEditor from '../../components/admin/StockThemeEditor.jsx';
import StockThemePreview from '../../components/admin/StockThemePreview.jsx';
import SupportThemeEditor from '../../components/admin/SupportThemeEditor.jsx';
import SupportThemePreview from '../../components/admin/SupportThemePreview.jsx';
import { useSectionTitles } from '../../contexts/SectionTitlesContext.jsx';
import { getSectionTitleValue } from '../../constants/sectionTitleConfig.js';
import {
  createHealthGuide,
  createLifestyleGuide,
  createParentingGuide,
  createStockGuide,
  createSupportGuide,
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeParentingGuide,
  normalizeStockGuide,
  normalizeSupportGuide
} from '../../utils/themeDraftDefaults.js';
import {
  getCategoryOptions,
  getDefaultCategory,
  getSubcategoryOptions,
  isValidCategory,
  isValidSubcategory
} from '../../constants/categoryStructure.js';
import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from '../../constants/themeConfig.js';
import { getThemePrompt } from '../../constants/themePrompts.js';
import { deleteIssue, getIssueById, updateIssue } from '../../firebaseClient.js';
import { emptyDraft, ensureThemeGuides } from '../../utils/emptyDraft.js';
import {
  buildSubmissionPayload,
  normalizeCoreKeywords,
  parseDraftStrict,
  sanitizeJsonNewlines,
  stringifyDraftForClipboard,
  withDefaultDate
} from '../../utils/draftSerialization.js';
const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function normalizeDraft(raw) {
  if (!raw) {
    return ensureThemeGuides({ ...emptyDraft });
  }
  const safeTheme = isValidThemeId(raw.theme) ? raw.theme : DEFAULT_THEME_ID;
  const safeCategory = isValidCategory(safeTheme, raw.category)
    ? raw.category
    : getDefaultCategory(safeTheme);
  const safeSubcategory = isValidSubcategory(safeTheme, safeCategory, raw.subcategory)
    ? raw.subcategory
    : '';
  const base = ensureThemeGuides({ ...emptyDraft, ...raw });
  const withDate = withDefaultDate(base);
  return {
    ...withDate,
    theme: safeTheme,
    category: safeCategory,
    subcategory: safeSubcategory,
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map((item) => String(item ?? '')) : [],
    coreKeywords: normalizeCoreKeywords(raw?.coreKeywords ?? base.coreKeywords),
    date: withDate.date,
    progressiveView: raw.progressiveView
      ? {
          headline: raw.progressiveView.headline ?? '',
          bullets: Array.isArray(raw.progressiveView.bullets)
            ? raw.progressiveView.bullets.map((item) => String(item ?? ''))
            : [''],
          intensity:
            typeof raw.progressiveView.intensity === 'number' ? raw.progressiveView.intensity : -1,
          note: raw.progressiveView.note || '아래 내용은 일부 진보측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.'
        }
      : null,
    conservativeView: raw.conservativeView
      ? {
          headline: raw.conservativeView.headline ?? '',
          bullets: Array.isArray(raw.conservativeView.bullets)
            ? raw.conservativeView.bullets.map((item) => String(item ?? ''))
            : [''],
          intensity:
            typeof raw.conservativeView.intensity === 'number' ? raw.conservativeView.intensity : -1,
          note: raw.conservativeView.note || '아래 내용은 일부 보수측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.'
        }
      : null,
    impactToLife: raw.impactToLife
      ? { text: raw.impactToLife.text ?? '', note: '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)' }
      : null,
    sources: Array.isArray(raw.sources)
      ? raw.sources.map((source) => ({
          type: source?.type ?? 'etc',
          channelName: source?.channelName ?? '',
          sourceDate: source?.sourceDate ?? '',
          timestamp: source?.timestamp ?? '',
          note: source?.note ?? ''
        }))
      : [],
    // ✅ 가이드 정규화 추가/유지
    parentingGuide: normalizeParentingGuide(raw.parentingGuide ?? base.parentingGuide, { withPresets: true }),
    healthGuide: normalizeHealthGuide(raw.healthGuide ?? base.healthGuide, { withPresets: true }),
    lifestyleGuide: normalizeLifestyleGuide(raw.lifestyleGuide ?? base.lifestyleGuide),
    stockGuide: normalizeStockGuide(raw.stockGuide ?? base.stockGuide),
    supportGuide: normalizeSupportGuide(raw.supportGuide ?? base.supportGuide, { withPresets: true })
  };
}

function AdminEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issueDraft, setIssueDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [promptCopyFeedback, setPromptCopyFeedback] = useState('');
  const [promptKeywordInput, setPromptKeywordInput] = useState('');
  const [contentKeywordInput, setContentKeywordInput] = useState('');
  const copyTimeoutRef = useRef(null);

  const { titles: sectionTitles } = useSectionTitles();
  const selectedTheme = issueDraft?.theme && isValidThemeId(issueDraft.theme) ? issueDraft.theme : DEFAULT_THEME_ID;
  const fallbackCategory = getDefaultCategory(selectedTheme);
  const categoryValue = issueDraft?.category ?? fallbackCategory;
  const subcategoryValue = issueDraft?.subcategory ?? '';
  const themeMeta = THEME_CONFIG.find((item) => item.id === selectedTheme) ?? THEME_CONFIG[0];
  const showPerspectiveSections = themeMeta?.showPerspectives ?? false;
  const themePrompt = getThemePrompt(selectedTheme);
  const isClipboardSupported = typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
  const coreKeywords = Array.isArray(issueDraft?.coreKeywords) ? issueDraft.coreKeywords : [];
  const keywordCount = coreKeywords.length;
  const hasRecommendedKeywordCount = keywordCount >= 5;
  const keywordStatusText = hasRecommendedKeywordCount
    ? `권장 개수 충족 (${keywordCount}개 입력됨)`
    : `권장 5개 이상 (현재 ${keywordCount}개)`;
  const isCopyError = promptCopyFeedback.startsWith('복사 실패');
  const isJsonInputEmpty = jsonInput.trim().length === 0;
  const isJsonAdjustRecommended = jsonError.includes('Bad control character');

  const easySummaryHeading = getSectionTitleValue(sectionTitles, 'general.easySummary.title');
  const backgroundHeading = getSectionTitleValue(sectionTitles, 'general.background.title');
  const keyPointsHeading = getSectionTitleValue(sectionTitles, 'general.keyPoints.title');
  const progressiveHeading = getSectionTitleValue(sectionTitles, 'general.progressiveView.title');
  const progressiveBadge = getSectionTitleValue(sectionTitles, 'general.progressiveView.badge');
  const conservativeHeading = getSectionTitleValue(sectionTitles, 'general.conservativeView.title');
  const conservativeBadge = getSectionTitleValue(sectionTitles, 'general.conservativeView.badge');
  const impactHeading = getSectionTitleValue(sectionTitles, 'general.impactToLife.title');
  const impactBadge = getSectionTitleValue(sectionTitles, 'general.impactToLife.badge');
  const sourcesHeading = getSectionTitleValue(sectionTitles, 'general.sources.title');

  const categoryOptions = useMemo(() => getCategoryOptions(selectedTheme), [selectedTheme]);
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptions(selectedTheme, categoryValue),
    [categoryValue, selectedTheme]
  );

  useEffect(() => {
    if (!issueDraft) {
      return;
    }

    if (categoryOptions.length === 0) {
      if (categoryValue !== '' || subcategoryValue !== '') {
        setIssueDraft((prev) => {
          if (!prev || (prev.category === '' && prev.subcategory === '')) {
            return prev;
          }
          return { ...prev, category: '', subcategory: '' };
        });
      }
    } else if (!categoryOptions.includes(categoryValue)) {
      const fallbackCategory = categoryOptions[0];
      setIssueDraft((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.category === fallbackCategory && prev.subcategory === '') {
          return prev;
        }
        return { ...prev, category: fallbackCategory, subcategory: '' };
      });
    } else if (subcategoryValue && !subcategoryOptions.includes(subcategoryValue)) {
      setIssueDraft((prev) => ({ ...prev, subcategory: '' }));
    }
  }, [categoryOptions, categoryValue, issueDraft, subcategoryOptions, subcategoryValue]);

  useEffect(() => {
    if (!id) {
      setLoadError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadIssue() {
      setIsLoading(true);
      setLoadError('');
      try {
        const data = await getIssueById(id);
        if (!isMounted) {
          return;
        }
        if (!data) {
          throw new Error('해당 문서를 찾을 수 없습니다.');
        }
        const normalized = normalizeDraft(data);
        setIssueDraft(normalized);
        setPromptKeywordInput('');
        setContentKeywordInput('');
      } catch (error) {
        console.error('Firestore 문서 불러오기 실패:', error);
        if (isMounted) {
          setLoadError(error.message || '문서를 불러오지 못했습니다.');
        }
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

  useEffect(() => {
    if (!submitSuccess) {
      return undefined;
    }
    const timer = window.setTimeout(() => setSubmitSuccess(''), 2000);
    return () => window.clearTimeout(timer);
  }, [submitSuccess]);

  useEffect(() => {
    if (!issueDraft) {
      return;
    }
    const serialized = stringifyDraftForClipboard(issueDraft);
    setJsonInput(serialized);
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

  const parseKeywordInput = (rawText) => {
    if (typeof rawText !== 'string') {
      return [];
    }
    const tokens = rawText
      .split(/[\n,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    return normalizeCoreKeywords(tokens);
  };

  const handleAddKeywords = (rawText) => {
    const parsed = parseKeywordInput(rawText);
    if (parsed.length === 0) {
      return false;
    }
    let added = false;
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const current = Array.isArray(prev.coreKeywords) ? [...prev.coreKeywords] : [];
      const seen = new Set(current);
      const next = [...current];
      parsed.forEach((keyword) => {
        if (!seen.has(keyword)) {
          seen.add(keyword);
          next.push(keyword);
          added = true;
        }
      });
      if (!added) {
        return prev;
      }
      return { ...prev, coreKeywords: next };
    });
    return added;
  };

  const handleRemoveKeyword = (index) => {
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const current = Array.isArray(prev.coreKeywords) ? [...prev.coreKeywords] : [];
      if (index < 0 || index >= current.length) {
        return prev;
      }
      current.splice(index, 1);
      return { ...prev, coreKeywords: current };
    });
  };

  const handleClearKeywords = () => {
    setIssueDraft((prev) => (prev ? { ...prev, coreKeywords: [] } : prev));
  };

  const handlePromptKeywordSubmit = () => {
    if (handleAddKeywords(promptKeywordInput)) {
      setPromptKeywordInput('');
    }
  };

  const handleContentKeywordSubmit = () => {
    if (handleAddKeywords(contentKeywordInput)) {
      setContentKeywordInput('');
    }
  };

  const handleKeywordInputKeyDown = (event, submitHandler) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitHandler();
    }
  };

  const renderKeywordChips = () => {
    if (coreKeywords.length === 0) {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          아직 입력된 핵심 키워드가 없습니다. AI 응답을 확인한 뒤 최소 5개 이상 정리해 주세요.
        </p>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {coreKeywords.map((keyword, index) => (
          <span
            key={`edit-core-${index}`}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            <span>{keyword}</span>
            <button
              type="button"
              onClick={() => handleRemoveKeyword(index)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-100 dark:hover:bg-emerald-500/50"
              aria-label={`${keyword} 키워드 삭제`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    );
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

  const handleLoadJson = () => {
    try {
      const draft = parseDraftStrict(jsonInput);
      setIssueDraft(draft);
      setPromptKeywordInput('');
      setContentKeywordInput('');
      setJsonError('');
      setSubmitError('');
      setSubmitSuccess('');
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
      const draft = parseDraftStrict(sanitized);
      setIssueDraft(draft);
      setPromptKeywordInput('');
      setContentKeywordInput('');
      setJsonError('');
      setSubmitError('');
      setSubmitSuccess('');
    } catch (error) {
      setJsonError(`❌ JSON 파싱 오류: ${error.message}`);
    }
  };

  const handleCopyJson = async () => {
    if (!isClipboardSupported || !issueDraft) {
      window.alert('브라우저가 클립보드 복사를 지원하지 않거나 문서가 로드되지 않았습니다.');
      return;
    }
    try {
      const serialized = stringifyDraftForClipboard({ ...issueDraft, theme: selectedTheme });
      await navigator.clipboard.writeText(serialized);
      window.alert('현재 글의 JSON을 복사했어요.');
    } catch (error) {
      console.error('JSON 복사 실패:', error);
      window.alert('JSON 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const previewBackground = useMemo(() => {
    if (!issueDraft?.background) {
      return [];
    }
    return issueDraft.background
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [issueDraft?.background]);

  const previewKeyPoints = useMemo(() => {
    if (!issueDraft?.keyPoints) {
      return [];
    }
    return issueDraft.keyPoints.map((point) => (typeof point === 'string' ? point : String(point ?? ''))).filter(Boolean);
  }, [issueDraft?.keyPoints]);

  const previewSources = useMemo(() => {
    if (!issueDraft?.sources) {
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
  }, [issueDraft?.sources]);

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleGroupbuyLinkChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => ({ ...prev, groupbuyLink: value }));
  };

  const handleThemeChange = (event) => {
    const { value } = event.target;
    const nextTheme = isValidThemeId(value) ? value : DEFAULT_THEME_ID;
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const base = ensureThemeGuides(prev);
      const nextThemeMeta = THEME_CONFIG.find((theme) => theme.id === nextTheme);

      const draft = {
        ...base,
        theme: nextTheme,
        parentingGuide: base.parentingGuide ?? createParentingGuide(),
        healthGuide: base.healthGuide ?? createHealthGuide(),
        lifestyleGuide: base.lifestyleGuide ?? createLifestyleGuide(),
        stockGuide: base.stockGuide ?? createStockGuide(),
        supportGuide: base.supportGuide ?? createSupportGuide()
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
    setIssueDraft((prev) => (prev ? { ...prev, parentingGuide: nextGuide } : prev));
  };

  const handleHealthGuideChange = (nextGuide) => {
    setIssueDraft((prev) => (prev ? { ...prev, healthGuide: nextGuide } : prev));
  };

  const handleLifestyleGuideChange = (nextGuide) => {
    setIssueDraft((prev) => (prev ? { ...prev, lifestyleGuide: nextGuide } : prev));
  };

  const handleEasySummaryChange = (event) => {
    const value = event.target.value.replace(/\n+/g, ' ').trimStart();
    setIssueDraft((prev) => ({ ...prev, easySummary: value }));
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }
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
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        subcategory: isValidSubcategory(selectedTheme, prev.category, value) ? value : ''
      };
    });
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

  const handleSubmit = async () => {
    if (!id || !issueDraft) {
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const payload = buildSubmissionPayload({ ...issueDraft, theme: selectedTheme });
      await updateIssue(id, payload);
      setIssueDraft(payload);
      setJsonInput(stringifyDraftForClipboard(payload));
      setJsonError('');
      setSubmitSuccess('수정이 완료되어 Firestore에 반영되었습니다.');
    } catch (error) {
      console.error('Firestore 수정 실패:', error);
      setSubmitError(error?.message || '수정 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      return;
    }
    const ok = window.confirm('정말로 이 문서를 삭제할까요? 삭제 후에는 복원할 수 없습니다.');
    if (!ok) {
      return;
    }
    try {
      await deleteIssue(id);
      window.alert('삭제 완료');
      navigate('/admin/list');
    } catch (error) {
      console.error('Firestore 삭제 실패:', error);
      setSubmitError(error?.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {loadError}
        </p>
        <Link
          to="/admin/list"
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!issueDraft) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">게시물 수정</h1>
      </header>

      {submitSuccess && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          {submitSuccess}
        </p>
      )}
      {submitError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {submitError}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {THEME_CONFIG.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange({ target: { value: theme.id } })}
                className={
                  selectedTheme === theme.id
                    ? 'inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
                    : 'inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-900/70'
                }
              >
                {theme.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyPrompt}
            disabled={!isClipboardSupported || !themePrompt}
            className={
              isClipboardSupported && themePrompt
                ? 'inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
                : 'inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
            }
          >
            프롬프트 복사
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{themeMeta?.description}</p>
        {Array.isArray(themeMeta?.keyAreas) && themeMeta.keyAreas.length > 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">세부 영역: {themeMeta.keyAreas.join(' · ')}</p>
        ) : null}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">핵심 키워드 (데이터 수집용)</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">AI 응답에서 도출된 정보를 바탕으로 최소 5개 이상 정리해 두면 데이터 수집에 도움이 됩니다.</p>
              </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      hasRecommendedKeywordCount
                        ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-300'
                        : 'text-xs font-semibold text-slate-600 dark:text-slate-300'
                    }
                  >
                    {keywordStatusText}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearKeywords}
                    disabled={coreKeywords.length === 0}
                    className={`inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-500 ${
                      coreKeywords.length === 0
                        ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : 'text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    모두 지우기
                  </button>
                </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={promptKeywordInput}
              onChange={(event) => setPromptKeywordInput(event.target.value)}
              onKeyDown={(event) => handleKeywordInputKeyDown(event, handlePromptKeywordSubmit)}
              placeholder="예: 금리 인하, 전세시장, 정책 발표"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handlePromptKeywordSubmit}
              className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              추가
            </button>
          </div>
          <div className="space-y-2">{renderKeywordChips()}</div>
        </div>
        {promptCopyFeedback && (
          <p
            className={`text-xs font-semibold ${
              isCopyError ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-200'
            }`}
          >
            {promptCopyFeedback}
          </p>
        )}
      </section>

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
            disabled={isJsonInputEmpty}
            className={`inline-flex items-center rounded-lg px-4 py-2 font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              isJsonInputEmpty
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
            onClick={() => setJsonInput(stringifyDraftForClipboard({ ...issueDraft, theme: selectedTheme }))}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            현재 내용으로 새로고침
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">JSON은 한 줄 문자열이어야 합니다. 필요한 경우 조정하기 버튼으로 줄바꿈을 제거하세요.</p>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">기본 정보</h2>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-900"
              >
                이 글 삭제
              </button>
            </div>
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
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">쉬운 요약 (일반인 설명용)</span>
              <textarea
                value={issueDraft.easySummary}
                onChange={handleEasySummaryChange}
                className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            {selectedTheme === 'groupbuy' ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">관련 링크</span>
                <input
                  type="url"
                  inputMode="url"
                  value={issueDraft.groupbuyLink ?? ''}
                  onChange={handleGroupbuyLinkChange}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="https://"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  공동구매를 진행하는 페이지 주소를 입력해 주세요.
                </span>
              </label>
            ) : null}
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
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">핵심 키워드 관리</span>
                <span
                  className={
                    hasRecommendedKeywordCount
                      ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-300'
                      : 'text-xs font-semibold text-slate-600 dark:text-slate-300'
                  }
                >
                  {keywordStatusText}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">이 목록은 글과 함께 Firestore에 저장됩니다. 필요하면 계속 추가하거나 삭제하세요.</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={contentKeywordInput}
                  onChange={(event) => setContentKeywordInput(event.target.value)}
                  onKeyDown={(event) => handleKeywordInputKeyDown(event, handleContentKeywordSubmit)}
                  placeholder="예: 기준금리, 주거 안정, 지원 제도"
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleContentKeywordSubmit}
                  className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  추가
                </button>
              </div>
              <div className="space-y-2">{renderKeywordChips()}</div>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">요약 카드 문장</span>
              <textarea
                value={issueDraft.summaryCard}
                onChange={handleFieldChange('summaryCard')}
                className="min-h-[100px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">배경 설명</span>
              <textarea
                value={issueDraft.background}
                onChange={handleFieldChange('background')}
                className="min-h-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
            <ParentingThemeEditor guide={issueDraft.parentingGuide} onChange={handleParentingGuideChange} />
          ) : null}

          {selectedTheme === 'health' ? (
            <HealthThemeEditor guide={issueDraft.healthGuide} onChange={handleHealthGuideChange} />
          ) : null}

          {selectedTheme === 'lifestyle' ? (
            <LifestyleThemeEditor guide={issueDraft.lifestyleGuide} onChange={handleLifestyleGuideChange} />
          ) : null}
          {selectedTheme === 'stocks' ? (
            <StockThemeEditor
              guide={issueDraft.stockGuide}
              onChange={(next) => setIssueDraft((prev) => (prev ? { ...prev, stockGuide: next } : prev))}
            />
          ) : null}

          {selectedTheme === 'support' ? (
            <SupportThemeEditor
              guide={issueDraft.supportGuide}
              onChange={(next) => setIssueDraft((prev) => (prev ? { ...prev, supportGuide: next } : prev))}
            />
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
              선택한 테마에서는 진보/보수 비교 섹션을 사용하지 않습니다. 필요 시 테마를 "사건/정책"으로 변경한 뒤 다시 편집해 주세요.
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
                        <option value="official">공식 발표</option>
                        <option value="youtube">유튜브</option>
                        <option value="media">언론/매체</option>
                        <option value="etc">기타</option>
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? 'Firestore에 저장 중...' : '수정 저장'}
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              disabled={!isClipboardSupported}
              className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-base font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                isClipboardSupported
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                  : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              JSON 복사
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            TODO: 현재는 인증이 없어 누구나 수정/삭제가 가능하다. 실제 서비스에서는 접근 제한과 Firestore Security Rules 강화를 진행해야 한다.
          </p>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              현재 입력 상태를 기반으로 상세 페이지가 어떻게 보이는지 확인하세요.
            </p>
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
                  {issueDraft?.category || '미선택'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500 dark:text-slate-400">하위 카테고리</dt>
                <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">
                  {issueDraft?.subcategory || '미선택'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500 dark:text-slate-400">날짜</dt>
                <dd className="text-right font-semibold text-slate-700 dark:text-slate-100">
                  {issueDraft?.date || '정보 부족'}
                </dd>
              </div>
            </dl>
          </div>

          {issueDraft.easySummary && (
            <SectionCard title={easySummaryHeading} tone="neutral">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{issueDraft.easySummary}</p>
            </SectionCard>
          )}

          <SectionCard title={backgroundHeading} tone="neutral">
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

          <SectionCard title={keyPointsHeading} tone="neutral">
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

          {selectedTheme === 'support' ? (
            <SupportThemePreview guide={issueDraft.supportGuide} />
          ) : null}

          {issueDraft.progressiveView ? (
            <SectionCard title={progressiveHeading} tone="progressive" badgeText={progressiveBadge}>
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
            <SectionCard title={conservativeHeading} tone="conservative" badgeText={conservativeBadge}>
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
            <SectionCard title={impactHeading} tone="impact" badgeText={impactBadge}>
              <p className="text-sm text-slate-700 dark:text-slate-200">{issueDraft.impactToLife.text}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{issueDraft.impactToLife.note}</p>
            </SectionCard>
          ) : null}

          <SectionCard title={sourcesHeading} tone="neutral">
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
    </div>
  );
}

export default AdminEditPage;
