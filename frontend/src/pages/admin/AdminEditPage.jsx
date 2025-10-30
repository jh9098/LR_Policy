// frontend/src/pages/admin/AdminEditPage.jsx
// Firestore Web SDK로 직접 문서를 읽어와 수정/삭제한다. Render 백엔드를 전혀 호출하지 않는다.
// 현재 누구나 /admin/edit/:id 에 접근하면 문서를 수정하거나 삭제할 수 있다. TODO: 프로덕션에서는 접근 제한과 보안 규칙 강화를 반드시 수행해야 한다.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import {
  CATEGORY_OPTIONS,
  getSubcategoryOptions,
  isValidCategory,
  isValidSubcategory
} from '../../constants/categoryStructure.js';
import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from '../../constants/themeConfig.js';
import { deleteIssue, getIssueById, updateIssue } from '../../firebaseClient.js';
import { emptyDraft } from '../../utils/emptyDraft.js';
const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function normalizeDraft(raw) {
  if (!raw) {
    return { ...emptyDraft };
  }
  const safeTheme = isValidThemeId(raw.theme) ? raw.theme : DEFAULT_THEME_ID;
  const safeCategory = isValidCategory(raw.category) ? raw.category : '기타';
  const safeSubcategory = isValidSubcategory(safeCategory, raw.subcategory) ? raw.subcategory : '';
  return {
    ...emptyDraft,
    ...raw,
    theme: safeTheme,
    category: safeCategory,
    subcategory: safeSubcategory,
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map((item) => String(item ?? '')) : [],
    progressiveView: raw.progressiveView
      ? {
          headline: raw.progressiveView.headline ?? '',
          bullets: Array.isArray(raw.progressiveView.bullets)
            ? raw.progressiveView.bullets.map((item) => String(item ?? ''))
            : [''],
          intensity:
            typeof raw.progressiveView.intensity === 'number' ? raw.progressiveView.intensity : -1,
          note: raw.progressiveView.note || PROGRESSIVE_NOTE
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
          note: raw.conservativeView.note || CONSERVATIVE_NOTE
        }
      : null,
    impactToLife: raw.impactToLife
      ? { text: raw.impactToLife.text ?? '', note: raw.impactToLife.note || IMPACT_NOTE }
      : null,
    sources: Array.isArray(raw.sources)
      ? raw.sources.map((source) => ({
          type: source?.type ?? 'etc',
          channelName: source?.channelName ?? '',
          sourceDate: source?.sourceDate ?? '',
          timestamp: source?.timestamp ?? '',
          note: source?.note ?? ''
        }))
      : []
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

  const categoryValue = issueDraft?.category ?? '기타';
  const subcategoryValue = issueDraft?.subcategory ?? '';
  const selectedTheme = issueDraft?.theme && isValidThemeId(issueDraft.theme) ? issueDraft.theme : DEFAULT_THEME_ID;
  const themeMeta = THEME_CONFIG.find((item) => item.id === selectedTheme) ?? THEME_CONFIG[0];
  const showPerspectiveSections = themeMeta?.showPerspectives ?? false;

  const subcategoryOptions = useMemo(() => getSubcategoryOptions(categoryValue), [categoryValue]);

  useEffect(() => {
    if (!issueDraft) {
      return;
    }
    if (subcategoryValue && !subcategoryOptions.includes(subcategoryValue)) {
      setIssueDraft((prev) => ({ ...prev, subcategory: '' }));
    }
  }, [issueDraft, subcategoryValue, subcategoryOptions]);

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
        setIssueDraft(normalizeDraft(data));
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

  const handleThemeChange = (event) => {
    const { value } = event.target;
    const nextTheme = isValidThemeId(value) ? value : DEFAULT_THEME_ID;
    setIssueDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const draft = { ...prev, theme: nextTheme };
      const nextThemeMeta = THEME_CONFIG.find((item) => item.id === nextTheme);
      if (!nextThemeMeta?.showPerspectives) {
        draft.progressiveView = null;
        draft.conservativeView = null;
      }
      return draft;
    });
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
      const nextCategory = isValidCategory(value) ? value : prev.category;
      const allowedSubcategories = getSubcategoryOptions(nextCategory);
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
        subcategory: isValidSubcategory(prev.category, value) ? value : ''
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
      const payload = {
        ...issueDraft,
        theme: selectedTheme,
        progressiveView: showPerspectiveSections ? issueDraft.progressiveView : null,
        conservativeView: showPerspectiveSections ? issueDraft.conservativeView : null
      };
      await updateIssue(id, payload);
      setIssueDraft(payload);
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
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Firestore에서 불러온 내용을 직접 편집합니다. 기존 데이터에 테마가 없으면 "사건/정책"으로 자동 지정되며, 필요 시 다른 테마로 변경한 뒤 저장해 주세요. 지금은 인증이 없어 누구나 수정/삭제가 가능하니 URL을 외부에 공유하지 마세요.
        </p>
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
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">쉬운 요약 (일반인 설명용)</span>
              <textarea
                value={issueDraft.easySummary}
                onChange={handleEasySummaryChange}
                className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                />
              </label>
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

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
          >
            {isSubmitting ? 'Firestore에 저장 중...' : '수정 저장'}
          </button>
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
    </div>
  );
}

export default AdminEditPage;
