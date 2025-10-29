// frontend/src/pages/AdminPage.jsx
import { useEffect, useMemo, useState } from 'react';
import SectionCard from '../components/SectionCard.jsx';
import IntensityBar from '../components/IntensityBar.jsx';
import { API_BASE_URL } from '../config.js';
import { parseSources } from '../utils/parseSources.js';

const CATEGORY_OPTIONS = ['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타'];
const DRAFT_STORAGE_KEY = 'adminDraftV2';
const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function getTodayKstDateString() {
  const now = new Date();
  const seoulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = seoulNow.getFullYear();
  const month = String(seoulNow.getMonth() + 1).padStart(2, '0');
  const day = String(seoulNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialForm() {
  const today = getTodayKstDateString();
  return {
    title: '',
    date: today,
    category: CATEGORY_OPTIONS[0],
    summaryCard: '',
    background: '',
    keyPoints: '',
    progressiveHeadline: '',
    progressiveBullets: '',
    progressiveIntensity: '',
    conservativeHeadline: '',
    conservativeBullets: '',
    conservativeIntensity: '',
    impactToLifeText: '',
    sources: ''
  };
}

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

function AdminPage() {
  const [formData, setFormData] = useState(() => {
    const baseForm = createInitialForm();
    if (typeof window === 'undefined') {
      return baseForm;
    }
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...baseForm, ...parsed };
        if (!parsed?.date) {
          merged.date = baseForm.date;
        }
        return merged;
      }
    } catch (error) {
      console.warn('로컬 draft 복원 실패:', error);
    }
    return baseForm;
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
      console.warn('로컬 draft 저장 실패:', error);
    }
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    const freshForm = createInitialForm();
    setFormData(freshForm);
    setSubmitError('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(freshForm));
      } catch (error) {
        console.warn('로컬 draft 초기화 저장 실패:', error);
      }
    }
  };

  const previewData = useMemo(() => {
    const keyPoints = splitLines(formData.keyPoints);
    const progressiveBullets = splitLines(formData.progressiveBullets);
    const conservativeBullets = splitLines(formData.conservativeBullets);
    const progressiveIntensity = parseIntensity(formData.progressiveIntensity);
    const conservativeIntensity = parseIntensity(formData.conservativeIntensity);
    const sources = parseSources(formData.sources);

    return {
      ...formData,
      keyPoints,
      progressiveView:
        formData.progressiveHeadline || progressiveBullets.length > 0
          ? {
              headline: formData.progressiveHeadline,
              bullets: progressiveBullets,
              intensity: progressiveIntensity,
              note: PROGRESSIVE_NOTE
            }
          : null,
      conservativeView:
        formData.conservativeHeadline || conservativeBullets.length > 0
          ? {
              headline: formData.conservativeHeadline,
              bullets: conservativeBullets,
              intensity: conservativeIntensity,
              note: CONSERVATIVE_NOTE
            }
          : null,
      impactToLife: formData.impactToLifeText
        ? {
            text: formData.impactToLifeText,
            note: IMPACT_NOTE
          }
        : null,
      sources
    };
  }, [formData]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const keyPoints = splitLines(formData.keyPoints);
    const progressiveBullets = splitLines(formData.progressiveBullets);
    const conservativeBullets = splitLines(formData.conservativeBullets);
    const progressiveIntensity = parseIntensity(formData.progressiveIntensity);
    const conservativeIntensity = parseIntensity(formData.conservativeIntensity);
    const sources = parseSources(formData.sources);

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
        payload.progressiveIntensity = progressiveIntensity;
      }
    }

    if (formData.conservativeHeadline || conservativeBullets.length > 0) {
      payload.conservativeView = {
        headline: formData.conservativeHeadline,
        bullets: conservativeBullets,
        note: CONSERVATIVE_NOTE
      };
      if (conservativeIntensity !== undefined) {
        payload.conservativeIntensity = conservativeIntensity;
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
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다. 필수 입력을 다시 확인해주세요.');
      }

      await response.json();
      alert('저장되었습니다. (Firestore 반영까지 수 초 걸릴 수 있음)');
      handleReset();
    } catch (error) {
      console.error('이슈 저장 실패:', error);
      setSubmitError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">관리자 입력</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          정책/사건의 사실을 먼저 정리한 뒤, 필요하다면 진보/보수 시각을 보조 정보로 입력하세요. 작성 중인 내용은 자동으로 저장됩니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">1. 기본 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                제목
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
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
                홈 카드 요약 (1~2문장)
                <input
                  type="text"
                  name="summaryCard"
                  value={formData.summaryCard}
                  onChange={handleChange}
                  required
                  placeholder="홈 화면 카드에 노출되는 짧은 요약"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">2. 배경/맥락</h2>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              배경 설명 (사실 중심)
              <textarea
                name="background"
                value={formData.background}
                onChange={handleChange}
                rows={8}
                required
                placeholder="이 정책/사건이 무엇인지, 왜 등장했는지, 공식적으로 확인된 사실만 작성"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">3. 진보 시각 (선택)</h2>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              진보 시각 헤드라인
              <input
                type="text"
                name="progressiveHeadline"
                value={formData.progressiveHeadline}
                onChange={handleChange}
                placeholder="예: 정부 개입은 서민 보호에 필수"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">note 문구는 자동으로 저장되며 수정할 수 없습니다.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">4. 보수 시각 (선택)</h2>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              보수 시각 헤드라인
              <input
                type="text"
                name="conservativeHeadline"
                value={formData.conservativeHeadline}
                onChange={handleChange}
                placeholder="예: 이건 선거용 퍼주기 정책이다"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              보수 시각 bullet (줄바꿈)
              <textarea
                name="conservativeBullets"
                value={formData.conservativeBullets}
                onChange={handleChange}
                rows={4}
                placeholder={`예:\n총선용 단기 부양이라는 비판\n재정 부담과 도덕적 해이를 우려`}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
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
                placeholder="예: 60"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">note 문구는 자동으로 저장되며 수정할 수 없습니다.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">5. 이게 내 삶에 뭐가 변함? (선택)</h2>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              생활 영향 요약 (ChatGPT 의견)
              <textarea
                name="impactToLifeText"
                value={formData.impactToLifeText}
                onChange={handleChange}
                rows={4}
                placeholder="내 삶에 미칠 변화를 중립적으로 설명 (ChatGPT 의견)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">설명 아래에는 자동으로 "{IMPACT_NOTE}" 문구가 표시됩니다.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">6. 출처</h2>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              출처 입력 (한 줄에 하나, 구분자는 |)
              <textarea
                name="sources"
                value={formData.sources}
                onChange={handleChange}
                rows={6}
                required
                placeholder={`예:\nyoutube|예시채널|2025-10-29|12:30|정부 개입이 필요하다고 주장\nofficial|국토교통부 브리핑|2025-10-29||LTV 상향 수치 발표`}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">형식: type|channelName|sourceDate|timestamp|note · timestamp가 없으면 비워두세요.</p>
          </section>

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

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">실시간 미리보기</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            입력한 내용이 상세 페이지에서 어떻게 보이는지 즉시 확인하세요.
          </p>

          <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
            {previewData.background ? (
              previewData.background
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p className="text-sm text-slate-500">배경 설명을 입력하면 여기에서 확인할 수 있습니다.</p>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">핵심 쟁점</h3>
              {previewData.keyPoints.length > 0 ? (
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  {previewData.keyPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">bullet을 입력하면 목록이 채워집니다.</p>
              )}
            </div>
          </SectionCard>

          {previewData.progressiveView && (
            <SectionCard title={previewData.progressiveView.headline || '진보 시각'} tone="progressive">
              {previewData.progressiveView.bullets.length > 0 ? (
                <ul className="space-y-1 list-disc pl-5">
                  {previewData.progressiveView.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">bullet을 입력하면 내용이 표시됩니다.</p>
              )}
              {previewData.progressiveView.intensity !== undefined && (
                <IntensityBar value={previewData.progressiveView.intensity} colorClass="bg-emerald-500" />
              )}
              <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80">{PROGRESSIVE_NOTE}</p>
            </SectionCard>
          )}

          {previewData.conservativeView && (
            <SectionCard title={previewData.conservativeView.headline || '보수 시각'} tone="conservative">
              {previewData.conservativeView.bullets.length > 0 ? (
                <ul className="space-y-1 list-disc pl-5">
                  {previewData.conservativeView.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-rose-900/80 dark:text-rose-200/80">bullet을 입력하면 내용이 표시됩니다.</p>
              )}
              {previewData.conservativeView.intensity !== undefined && (
                <IntensityBar value={previewData.conservativeView.intensity} colorClass="bg-rose-500" />
              )}
              <p className="text-[11px] text-rose-900/80 dark:text-rose-200/80">{CONSERVATIVE_NOTE}</p>
            </SectionCard>
          )}

          {previewData.impactToLife && (
            <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
              <p>{previewData.impactToLife.text}</p>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-200/80">{IMPACT_NOTE}</p>
            </SectionCard>
          )}

          <div className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-600">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">출처 미리보기</h3>
            {previewData.sources.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">입력한 출처가 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {previewData.sources.map((source, index) => (
                  <li key={`${source.channelName}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{source.channelName}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {source.type} · {source.sourceDate || '날짜 없음'} · {source.timestamp || '타임스탬프 없음'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">{source.note || '메모 없음'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AdminPage;
