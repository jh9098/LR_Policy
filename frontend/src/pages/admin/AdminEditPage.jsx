// frontend/src/pages/admin/AdminEditPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import IntensityBar from '../../components/IntensityBar.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { API_BASE_URL, ADMIN_SECRET } from '../../config.js';
import { parseSources } from '../../utils/parseSources.js';

const CATEGORY_OPTIONS = ['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];
const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function splitLines(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(/\r?\n|\r|\u2028/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseIntensity(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
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

function formatSourcesForTextarea(rawSources) {
  if (!Array.isArray(rawSources)) {
    return '';
  }

  return rawSources
    .map((source) => {
      if (!source) {
        return null;
      }
      const type = typeof source.type === 'string' && source.type.trim() ? source.type.trim() : 'etc';
      const channelName = typeof source.channelName === 'string' ? source.channelName.trim() : '';
      if (!channelName) {
        return null;
      }
      const sourceDate = typeof source.sourceDate === 'string' ? source.sourceDate.trim() : '';
      const timestampRaw = source.timestamp === null || source.timestamp === undefined ? '' : source.timestamp;
      const timestamp = typeof timestampRaw === 'string' ? timestampRaw.trim() : '';
      const note = typeof source.note === 'string' ? source.note.trim() : '';

      return [type, channelName, sourceDate, timestamp, note].join('|');
    })
    .filter(Boolean)
    .join('\n');
}

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function buildFormStateFromIssue(issue) {
  return {
    title: toSafeString(issue.title),
    date: toSafeString(issue.date),
    category: toSafeString(issue.category, '기타') || '기타',
    summaryCard: toSafeString(issue.summaryCard),
    background: toSafeString(issue.background),
    keyPoints: Array.isArray(issue.keyPoints) ? issue.keyPoints.map((point) => toSafeString(point)).join('\n') : '',
    progressiveHeadline: toSafeString(issue.progressiveView?.headline),
    progressiveBullets: Array.isArray(issue.progressiveView?.bullets)
      ? issue.progressiveView.bullets.map((point) => toSafeString(point)).join('\n')
      : '',
    progressiveIntensity:
      issue.progressiveView?.intensity === null || issue.progressiveView?.intensity === undefined
        ? ''
        : String(issue.progressiveView.intensity),
    conservativeHeadline: toSafeString(issue.conservativeView?.headline),
    conservativeBullets: Array.isArray(issue.conservativeView?.bullets)
      ? issue.conservativeView.bullets.map((point) => toSafeString(point)).join('\n')
      : '',
    conservativeIntensity:
      issue.conservativeView?.intensity === null || issue.conservativeView?.intensity === undefined
        ? ''
        : String(issue.conservativeView.intensity),
    impactToLifeText: toSafeString(issue.impactToLife?.text),
    sourcesRaw: formatSourcesForTextarea(issue.sources)
  };
}

function AdminEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const response = await fetch(`${API_BASE_URL}/issues/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? '해당 문서를 찾을 수 없습니다.' : '문서를 불러오지 못했습니다.');
        }
        const data = await response.json();
        if (!isMounted) {
          return;
        }
        setFormData(buildFormStateFromIssue({
          id: data.id ?? id,
          title: data.title ?? '',
          date: data.date ?? '',
          category: data.category ?? '기타',
          summaryCard: data.summaryCard ?? '',
          background: data.background ?? '',
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
          progressiveView: data.progressiveView ?? null,
          conservativeView: data.conservativeView ?? null,
          impactToLife: data.impactToLife ?? null,
          sources: Array.isArray(data.sources) ? data.sources : []
        }));
      } catch (error) {
        console.error('문서 불러오기 실패:', error);
        if (!isMounted) {
          return;
        }
        setLoadError(error.message || '알 수 없는 오류가 발생했습니다.');
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

  const handleDelete = async () => {
    if (!id || isSubmitting) {
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
      window.alert('삭제가 완료되었습니다.');
      navigate('/admin/list');
    } catch (error) {
      console.error('삭제 실패:', error);
      setLoadError(error.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
    setSubmitError('');
  };

  const previewData = useMemo(() => {
    if (!formData) {
      return null;
    }

    const keyPoints = splitLines(formData.keyPoints);
    const progressiveBullets = splitLines(formData.progressiveBullets);
    const conservativeBullets = splitLines(formData.conservativeBullets);
    const progressiveIntensity = parseIntensity(formData.progressiveIntensity);
    const conservativeIntensity = parseIntensity(formData.conservativeIntensity);
    const sources = parseSources(formData.sourcesRaw);

    const progressiveView =
      formData.progressiveHeadline || progressiveBullets.length > 0
        ? {
            headline: formData.progressiveHeadline,
            bullets: progressiveBullets,
            note: PROGRESSIVE_NOTE,
            intensity: progressiveIntensity
          }
        : null;

    const conservativeView =
      formData.conservativeHeadline || conservativeBullets.length > 0
        ? {
            headline: formData.conservativeHeadline,
            bullets: conservativeBullets,
            note: CONSERVATIVE_NOTE,
            intensity: conservativeIntensity
          }
        : null;

    const impactToLife = formData.impactToLifeText
      ? {
          text: formData.impactToLifeText,
          note: IMPACT_NOTE
        }
      : null;

    return {
      ...formData,
      keyPoints,
      progressiveView,
      conservativeView,
      impactToLife,
      sources
    };
  }, [formData]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData || !id) {
      return;
    }

    setSubmitError('');
    setSubmitSuccess('');

    const keyPoints = splitLines(formData.keyPoints);
    const progressiveBullets = splitLines(formData.progressiveBullets);
    const conservativeBullets = splitLines(formData.conservativeBullets);
    const progressiveIntensity = parseIntensity(formData.progressiveIntensity);
    const conservativeIntensity = parseIntensity(formData.conservativeIntensity);
    const sources = parseSources(formData.sourcesRaw);

    if (!formData.title || !formData.date || !formData.summaryCard || !formData.background) {
      setSubmitError('제목, 날짜, 요약 카드 문장, 배경/맥락 본문은 필수입니다.');
      return;
    }
    if (keyPoints.length === 0) {
      setSubmitError('핵심 쟁점 bullet을 최소 1개 이상 작성해주세요.');
      return;
    }
    if (sources.length === 0) {
      setSubmitError('출처를 최소 1개 이상 입력해야 합니다.');
      return;
    }

    const payload = {
      title: formData.title,
      date: formData.date,
      category: formData.category,
      summaryCard: formData.summaryCard,
      background: formData.background,
      keyPoints,
      sources
    };

    if (formData.progressiveHeadline || progressiveBullets.length > 0) {
      payload.progressiveView = {
        headline: formData.progressiveHeadline,
        bullets: progressiveBullets,
        note: PROGRESSIVE_NOTE
      };
      if (progressiveIntensity !== undefined) {
        payload.progressiveView.intensity = progressiveIntensity;
      }
    }

    if (formData.conservativeHeadline || conservativeBullets.length > 0) {
      payload.conservativeView = {
        headline: formData.conservativeHeadline,
        bullets: conservativeBullets,
        note: CONSERVATIVE_NOTE
      };
      if (conservativeIntensity !== undefined) {
        payload.conservativeView.intensity = conservativeIntensity;
      }
    }

    if (formData.impactToLifeText) {
      payload.impactToLife = {
        text: formData.impactToLifeText,
        note: IMPACT_NOTE
      };
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || '수정에 실패했습니다.');
      }

      const updated = await response.json();
      setFormData(buildFormStateFromIssue({
        id: updated.id ?? id,
        title: updated.title ?? payload.title,
        date: updated.date ?? payload.date,
        category: updated.category ?? payload.category,
        summaryCard: updated.summaryCard ?? payload.summaryCard,
        background: updated.background ?? payload.background,
        keyPoints: Array.isArray(updated.keyPoints) ? updated.keyPoints : keyPoints,
        progressiveView: updated.progressiveView ?? payload.progressiveView ?? null,
        conservativeView: updated.conservativeView ?? payload.conservativeView ?? null,
        impactToLife: updated.impactToLife ?? payload.impactToLife ?? null,
        sources: Array.isArray(updated.sources) ? updated.sources : sources
      }));
      setSubmitSuccess('수정 내용이 저장되었습니다. (Firestore 반영까지 수 초 걸릴 수 있습니다)');
    } catch (error) {
      console.error('수정 실패:', error);
      setSubmitError(error.message || '문서를 수정하는 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">글 수정</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            기존에 등록한 정책/사건 카드를 그대로 불러와 수정하고 저장할 수 있습니다. 입력 폼과 미리보기 레이아웃은 신규 등록 화면과 동일합니다.
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
            disabled={isSubmitting || isLoading}
            className="inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-900"
          >
            삭제
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-100/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
          {loadError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>
      ) : null}

      {!isLoading && !loadError && formData ? (
        <div className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">1. 기본 정보</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  제목
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  날짜 (YYYY-MM-DD)
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  카테고리
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  홈 카드 요약 (1~2문장)
                  <input
                    type="text"
                    name="summaryCard"
                    value={formData.summaryCard}
                    onChange={handleChange}
                    required
                    placeholder="홈 화면 카드에 노출되는 짧은 요약"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">2. 배경/맥락</h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                배경 설명 (사실 중심)
                <textarea
                  name="background"
                  value={formData.background}
                  onChange={handleChange}
                  rows={8}
                  required
                  placeholder="이 정책/사건이 무엇인지, 왜 등장했는지, 공식적으로 확인된 사실만 작성"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                핵심 쟁점 bullet (줄바꿈으로 구분)
                <textarea
                  name="keyPoints"
                  value={formData.keyPoints}
                  onChange={handleChange}
                  rows={4}
                  required
                  placeholder={`예:\nLTV 상향으로 초기 자금 부담이 줄었다\n정부는 서민 주거안정을 주장한다\n일부에서는 부채 리스크를 우려한다`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">3. 진보 시각 (선택)</h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                진보 시각 헤드라인
                <input
                  type="text"
                  name="progressiveHeadline"
                  value={formData.progressiveHeadline}
                  onChange={handleChange}
                  placeholder="예: 정부 개입은 서민 보호에 필수"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                진보 시각 bullet (줄바꿈)
                <textarea
                  name="progressiveBullets"
                  value={formData.progressiveBullets}
                  onChange={handleChange}
                  rows={4}
                  placeholder={`예:\n이 정책은 서민 주거 안정을 위해 필요하다는 주장\n시장 규제를 통한 격차 완화를 기대`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                진보 주장 강도 (0~100)
                <input
                  type="number"
                  name="progressiveIntensity"
                  value={formData.progressiveIntensity}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  placeholder="예: 70"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                note 문구는 자동으로 저장되며 수정할 수 없습니다. 강도 값은 비워두면 저장되지 않습니다.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">4. 보수 시각 (선택)</h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                보수 시각 헤드라인
                <input
                  type="text"
                  name="conservativeHeadline"
                  value={formData.conservativeHeadline}
                  onChange={handleChange}
                  placeholder="예: 이건 선거용 퍼주기 정책이다"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                보수 시각 bullet (줄바꿈)
                <textarea
                  name="conservativeBullets"
                  value={formData.conservativeBullets}
                  onChange={handleChange}
                  rows={4}
                  placeholder={`예:\n재정 건전성이 악화될 수 있다는 비판\n실수요자보다 투기 수요를 키울 것이라는 주장`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                보수 주장 강도 (0~100)
                <input
                  type="number"
                  name="conservativeIntensity"
                  value={formData.conservativeIntensity}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  placeholder="예: 50"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">5. 이게 내 삶에 뭐가 변함? (선택)</h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                생활 영향 요약
                <textarea
                  name="impactToLifeText"
                  value={formData.impactToLifeText}
                  onChange={handleChange}
                  rows={4}
                  placeholder="중립적 해석과 체감 영향을 요약해주세요. (ChatGPT의 의견)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">6. 출처 (필수)</h3>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                출처 목록
                <textarea
                  name="sourcesRaw"
                  value={formData.sourcesRaw}
                  onChange={handleChange}
                  rows={6}
                  required
                  placeholder={`형식: type|channelName|sourceDate|timestamp|note\n예: official|국토교통부|2023-09-01||보도자료`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                각 줄을 <code>type|channelName|sourceDate|timestamp|note</code> 형식으로 작성합니다. timestamp가 없으면 비워두고 <code>||</code>로 연결해도 됩니다.
              </p>
            </section>

            {submitError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-100/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
                {submitError}
              </p>
            ) : null}

            {submitSuccess ? (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
                {submitSuccess}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-900"
              >
                {isSubmitting ? '저장 중...' : '수정 내용 저장'}
              </button>
            </div>
          </form>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">실시간 미리보기</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              아래 미리보기는 상세 페이지 형태를 단순화한 버전입니다. 입력을 수정하면 즉시 반영되며, 비어 있는 섹션은 자동으로 숨겨집니다.
            </p>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{previewData?.category}</p>
                    <h4 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{previewData?.title || '제목이 여기에 표시됩니다'}</h4>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{previewData?.date}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{previewData?.summaryCard || '홈 카드 요약이 여기에 표시됩니다.'}</p>
              </section>

              <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
                {previewData && splitParagraphs(previewData.background).length > 0 ? (
                  splitParagraphs(previewData.background).map((paragraph, index) => <p key={index}>{paragraph}</p>)
                ) : (
                  <p className="text-slate-500">배경 설명을 입력하면 이곳에 문단이 표시됩니다.</p>
                )}
              </SectionCard>

              <SectionCard title="핵심 쟁점 요약" tone="neutral">
                {previewData && previewData.keyPoints.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {previewData.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">bullet을 입력하면 목록이 표시됩니다.</p>
                )}
              </SectionCard>

              {previewData?.progressiveView ? (
                <SectionCard title="주요 시각들 - 진보" tone="progressive">
                  {previewData.progressiveView.headline ? <p className="font-semibold">{previewData.progressiveView.headline}</p> : null}
                  {previewData.progressiveView.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {previewData.progressiveView.bullets.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-emerald-700 dark:text-emerald-200">{PROGRESSIVE_NOTE}</p>
                  {previewData.progressiveView.intensity !== undefined ? (
                    <IntensityBar value={previewData.progressiveView.intensity} label="주장 강도" colorClass="bg-emerald-500" />
                  ) : null}
                </SectionCard>
              ) : null}

              {previewData?.conservativeView ? (
                <SectionCard title="주요 시각들 - 보수" tone="conservative">
                  {previewData.conservativeView.headline ? <p className="font-semibold">{previewData.conservativeView.headline}</p> : null}
                  {previewData.conservativeView.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {previewData.conservativeView.bullets.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-rose-700 dark:text-rose-200">{CONSERVATIVE_NOTE}</p>
                  {previewData.conservativeView.intensity !== undefined ? (
                    <IntensityBar value={previewData.conservativeView.intensity} label="주장 강도" colorClass="bg-rose-500" />
                  ) : null}
                </SectionCard>
              ) : null}

              {previewData?.impactToLife ? (
                <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
                  <p>{previewData.impactToLife.text}</p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-200">{IMPACT_NOTE}</p>
                </SectionCard>
              ) : null}

              <SectionCard title="출처" tone="neutral">
                {previewData && previewData.sources.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {previewData.sources.map((source, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
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
                  <p className="text-slate-500">출처를 입력하면 리스트가 표시됩니다.</p>
                )}
              </SectionCard>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default AdminEditPage;
