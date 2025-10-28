// frontend/src/pages/AdminPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config.js';
import InfoBlock from '../components/InfoBlock.jsx';
import { parseSources } from '../utils/parseSources.js';

const CATEGORY_OPTIONS = ['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];
const DRAFT_STORAGE_KEY = 'adminDraftV1';

const initialFormState = {
  title: '',
  date: '',
  category: CATEGORY_OPTIONS[0],
  summary: '',
  summaryFacts: '',
  progressiveHeadline: '',
  progressivePoints: '',
  progressiveIntensity: '',
  conservativeHeadline: '',
  conservativePoints: '',
  conservativeIntensity: '',
  impactToLife: '',
  sources: ''
};

function parseMultiline(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(/\r?\n|\r|\u2028/)
    .map((item) => item.trim())
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

function AdminPage() {
  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') {
      return initialFormState;
    }

    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialFormState, ...parsed };
      }
    } catch (error) {
      console.warn('로컬 스토리지 초깃값 복구 실패:', error);
    }

    return initialFormState;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('로컬 스토리지 저장 실패:', error);
    }
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setSubmitError('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  };

  const previewData = useMemo(() => {
    const summaryFacts = parseMultiline(formData.summaryFacts);
    const progressivePoints = parseMultiline(formData.progressivePoints);
    const conservativePoints = parseMultiline(formData.conservativePoints);
    const sources = parseSources(formData.sources);

    return {
      title: formData.title,
      date: formData.date,
      category: formData.category,
      summary: formData.summary,
      summaryFacts,
      progressiveFrame: {
        headline: formData.progressiveHeadline,
        points: progressivePoints,
        note: '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음',
        intensity: parseIntensity(formData.progressiveIntensity)
      },
      conservativeFrame: {
        headline: formData.conservativeHeadline,
        points: conservativePoints,
        note: '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음',
        intensity: parseIntensity(formData.conservativeIntensity)
      },
      impactToLife: {
        text: formData.impactToLife,
        points: []
      },
      sources
    };
  }, [formData]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError('');

    const payload = {
      title: formData.title.trim(),
      date: formData.date,
      category: formData.category,
      summary: formData.summary.trim(),
      summaryFacts: parseMultiline(formData.summaryFacts),
      progressiveFrame: {
        headline: formData.progressiveHeadline.trim(),
        points: parseMultiline(formData.progressivePoints),
        note: '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음',
        intensity: parseIntensity(formData.progressiveIntensity)
      },
      conservativeFrame: {
        headline: formData.conservativeHeadline.trim(),
        points: parseMultiline(formData.conservativePoints),
        note: '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음',
        intensity: parseIntensity(formData.conservativeIntensity)
      },
      impactToLife: {
        text: formData.impactToLife.trim(),
        points: []
      },
      sources: parseSources(formData.sources)
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // TODO: x-admin-secret 헤더 추가 예정
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('서버에 정보를 저장하지 못했습니다.');
      }

      alert('등록 완료');
      handleReset();
    } catch (error) {
      console.error('이슈 등록 실패:', error);
      setSubmitError(error.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">새 사건 등록</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          입력 중인 내용은 자동으로 저장됩니다. 새로고침해도 작성 중인 초안이 사라지지 않으며, 저장 시 Firestore에 전송됩니다.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <form
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              제목
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="사건 제목을 입력하세요"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              날짜
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            카테고리
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            사건 요약
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={3}
              required
              placeholder="사건 전체 요약을 2~3문장으로 정리"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            확실한 사실 (줄바꿈으로 구분)
            <textarea
              name="summaryFacts"
              value={formData.summaryFacts}
              onChange={handleChange}
              rows={4}
              placeholder="사실로 확인된 정보만 입력"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              진보 프레임 헤드라인
              <input
                type="text"
                name="progressiveHeadline"
                value={formData.progressiveHeadline}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              보수 프레임 헤드라인
              <input
                type="text"
                name="conservativeHeadline"
                value={formData.conservativeHeadline}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              진보 프레임 포인트 (줄바꿈)
              <textarea
                name="progressivePoints"
                value={formData.progressivePoints}
                onChange={handleChange}
                rows={4}
                placeholder="진보 성향 채널들의 주장 요약"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              보수 프레임 포인트 (줄바꿈)
              <textarea
                name="conservativePoints"
                value={formData.conservativePoints}
                onChange={handleChange}
                rows={4}
                placeholder="보수 성향 채널들의 주장 요약"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              진보 프레임 강도 (0~100)
              <input
                type="number"
                name="progressiveIntensity"
                value={formData.progressiveIntensity}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="예: 70"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              보수 프레임 강도 (0~100)
              <input
                type="number"
                name="conservativeIntensity"
                value={formData.conservativeIntensity}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="예: 60"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            생활/시장 영향 요약
            <textarea
              name="impactToLife"
              value={formData.impactToLife}
              onChange={handleChange}
              rows={4}
              placeholder="ChatGPT 의견으로 중립적 영향 분석"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            출처 정보 (JSON 또는 지정 포맷)
            <textarea
              name="sources"
              value={formData.sources}
              onChange={handleChange}
              rows={6}
              placeholder="채널명, 영상 날짜 등"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
            />
          </label>

          {submitError && <p className="text-sm text-rose-500">{submitError}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? '저장 중...' : 'Firestore 저장'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
            >
              초기화
            </button>
          </div>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">미리보기</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            실제 카드가 어떻게 렌더링되는지 확인하세요. 강도 값은 0~100 범위에서만 저장됩니다.
          </p>
          <div className="space-y-4">
            <InfoBlock
              title="진보 프레임"
              badgeType="left"
              headline={previewData.progressiveFrame.headline}
              body={previewData.progressiveFrame.points}
              note={previewData.progressiveFrame.note}
            />
            <InfoBlock
              title="보수 프레임"
              badgeType="right"
              headline={previewData.conservativeFrame.headline}
              body={previewData.conservativeFrame.points}
              note={previewData.conservativeFrame.note}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AdminPage;
