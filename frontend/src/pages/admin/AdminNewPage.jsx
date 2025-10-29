// frontend/src/pages/admin/AdminNewPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import SectionCard from '../../components/SectionCard.jsx';
import IntensityBar from '../../components/IntensityBar.jsx';
import { getFirestoreClient } from '../../firebase/client.js';
import { parseSources } from '../../utils/parseSources.js';

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
    sourcesRaw: ''
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

function splitParagraphs(text) {
  if (!text) {
    return [];
  }
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function AdminNewPage() {
  const [formData, setFormData] = useState(() => {
    const base = createInitialForm();
    if (typeof window === 'undefined') {
      return base;
    }
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...base, ...parsed };
        if (!parsed?.date) {
          merged.date = base.date;
        }
        return merged;
      }
    } catch (error) {
      console.warn('로컬 draft 복원 실패:', error);
    }
    return base;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

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

  useEffect(() => {
    if (!submitSuccess || typeof window === 'undefined') {
      return undefined;
    }
    const timer = window.setTimeout(() => setSubmitSuccess(''), 2000);
    return () => window.clearTimeout(timer);
  }, [submitSuccess]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    const fresh = createInitialForm();
    setFormData(fresh);
    setSubmitError('');
    setSubmitSuccess('');
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fresh));
      } catch (error) {
        console.warn('로컬 draft 초기화 실패:', error);
      }
    }
  };

  const previewData = useMemo(() => {
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

    let firestoreInstance;
    try {
      firestoreInstance = getFirestoreClient();
    } catch (error) {
      console.error('Firebase 초기화 실패:', error);
      setSubmitError(error.message || 'Firebase 설정을 다시 확인해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const docRef = await addDoc(collection(firestoreInstance, 'issues'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      handleReset();
      setSubmitSuccess('등록이 완료되었습니다. (Firestore 반영까지 수 초 걸릴 수 있습니다)');
      if (typeof window !== 'undefined') {
        window.alert(`등록 완료 (문서 ID: ${docRef.id})`);
      }
    } catch (error) {
      console.error('이슈 등록 실패:', error);
      setSubmitError(error.message || 'Firestore 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">새 글 작성</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          정책/사건의 사실부터 정리한 뒤, 필요하면 진보/보수 시각을 선택적으로 입력하세요. 모든 입력은 자동으로 로컬에 저장됩니다.
        </p>
      </header>

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

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
            >
              입력 초기화
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{previewData.category}</p>
                  <h4 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{previewData.title || '제목이 여기에 표시됩니다'}</h4>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{previewData.date}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{previewData.summaryCard || '홈 카드 요약이 여기에 표시됩니다.'}</p>
            </section>

            <SectionCard title="이 사건/정책은 무엇인가?" tone="neutral">
              {splitParagraphs(previewData.background).length > 0 ? (
                splitParagraphs(previewData.background).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p className="text-slate-500">배경 설명을 입력하면 이곳에 문단이 표시됩니다.</p>
              )}
            </SectionCard>

            <SectionCard title="핵심 쟁점 요약" tone="neutral">
              {previewData.keyPoints.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5">
                  {previewData.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">bullet을 입력하면 목록이 표시됩니다.</p>
              )}
            </SectionCard>

            {previewData.progressiveView ? (
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

            {previewData.conservativeView ? (
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

            {previewData.impactToLife ? (
              <SectionCard title="이게 내 삶에 뭐가 변함?" tone="impact">
                <p>{previewData.impactToLife.text}</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-200">{IMPACT_NOTE}</p>
              </SectionCard>
            ) : null}

            <SectionCard title="출처" tone="neutral">
              {previewData.sources.length > 0 ? (
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
    </section>
  );
}

export default AdminNewPage;
