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
  conservativeHeadline: '',
  conservativePoints: '',
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
        note: '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
      },
      conservativeFrame: {
        headline: formData.conservativeHeadline,
        points: conservativePoints,
        note: '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
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
        note: '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
      },
      conservativeFrame: {
        headline: formData.conservativeHeadline.trim(),
        points: parseMultiline(formData.conservativePoints),
        note: '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
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
        <h1 className="text-3xl font-bold text-slate-900">새 사건 등록</h1>
        <p className="text-sm text-slate-600">
          입력 중인 내용은 자동으로 저장됩니다. 새로고침해도 작성 중인 초안이 사라지지 않으며, 저장 시 Firestore에 전송됩니다.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <form
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              제목
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="사건 제목을 입력하세요"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              날짜
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            카테고리
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            카드 요약 문장
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows={3}
              placeholder="홈 화면 카드에 노출될 짧은 요약"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            확실한 사실 (줄바꿈으로 구분)
            <textarea
              name="summaryFacts"
              value={formData.summaryFacts}
              onChange={handleChange}
              rows={4}
              placeholder="정부 발표, 공식 문서 등 객관적 사실을 줄바꿈으로 나열"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              진보 프레임 제목
              <input
                type="text"
                name="progressiveHeadline"
                value={formData.progressiveHeadline}
                onChange={handleChange}
                placeholder="예: 정부 개입이 필요하다"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              보수 프레임 제목
              <input
                type="text"
                name="conservativeHeadline"
                value={formData.conservativeHeadline}
                onChange={handleChange}
                placeholder="예: 시장 자율이 우선이다"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            진보 프레임 Bullet (줄바꿈)
            <textarea
              name="progressivePoints"
              value={formData.progressivePoints}
              onChange={handleChange}
              rows={4}
              placeholder="진보 진영 주장/전망을 줄바꿈으로 입력"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            보수 프레임 Bullet (줄바꿈)
            <textarea
              name="conservativePoints"
              value={formData.conservativePoints}
              onChange={handleChange}
              rows={4}
              placeholder="보수 진영 주장/전망을 줄바꿈으로 입력"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            이게 내 삶에 뭐가 변함? (ChatGPT 의견)
            <textarea
              name="impactToLife"
              value={formData.impactToLife}
              onChange={handleChange}
              rows={4}
              placeholder="생활/시장 영향 요약을 작성"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            출처 (type|channel|date|timestamp|note)
            <textarea
              name="sources"
              value={formData.sources}
              onChange={handleChange}
              rows={4}
              placeholder="youtube|삼프로TV|2024-03-01|12:30|주요 분석 구간"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isSubmitting}
            >
              초기화
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>

        <aside className="space-y-5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 p-5">
          <h2 className="text-base font-semibold text-indigo-800">실시간 미리보기</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{previewData.date || 'YYYY-MM-DD'}</span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
                {previewData.category}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{previewData.title || '사건 제목 미입력'}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {previewData.summary || '홈 화면 카드에 표시될 요약이 여기 노출됩니다.'}
            </p>
          </div>

          <InfoBlock
            title="확실한 사실"
            badgeType="fact"
            body={previewData.summaryFacts}
            note="프리뷰 전용 가상 카드"
          />
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
          <InfoBlock
            title="이게 내 삶에 뭐가 변함?"
            badgeType="impact"
            body={previewData.impactToLife}
            note="ChatGPT 의견 미리보기"
          />
        </aside>
      </div>
    </section>
  );
}

export default AdminPage;
