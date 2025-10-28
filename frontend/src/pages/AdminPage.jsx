// frontend/src/pages/AdminPage.jsx
import { useState } from 'react';

const initialFormState = {
  title: '',
  date: '',
  summaryFacts: '',
  progressiveFrame: '',
  conservativeFrame: '',
  impactToLife: '',
  sources: ''
};

function AdminPage() {
  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(initialFormState);
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">새 사건 등록</h1>
        <p className="text-sm text-slate-600">
          아래 폼에 사건 정보를 입력하세요. 현재는 미리보기 용도로만 작동하며, 추후 백엔드 연동 시 Firestore에 저장됩니다.
        </p>
      </header>

      <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            제목
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="사건 제목을 입력하세요"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            날짜
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
        </div>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          확실한 사실
          <textarea
            name="summaryFacts"
            value={formData.summaryFacts}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="정부 발표나 객관적 자료 위주의 사실만 입력하세요"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          진보 프레임 (확실하지 않은 사실)
          <textarea
            name="progressiveFrame"
            value={formData.progressiveFrame}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="진보적 시각에서 바라본 주장과 전망을 입력하세요"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          보수 프레임 (확실하지 않은 사실)
          <textarea
            name="conservativeFrame"
            value={formData.conservativeFrame}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="보수적 시각에서 바라본 주장과 전망을 입력하세요"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          이게 내 삶에 뭐가 변함? (ChatGPT의 의견)
          <textarea
            name="impactToLife"
            value={formData.impactToLife}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="생활에 미칠 영향에 대해 중립적으로 설명하세요"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          출처 (줄바꿈으로 구분)
          <textarea
            name="sources"
            value={formData.sources}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="유튜브 채널명, 업로드일, 타임스탬프 등을 줄바꿈으로 입력하세요"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            초기화
          </button>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            저장 (준비 중)
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-4 text-sm text-indigo-700">
        <h2 className="text-base font-semibold">미리보기</h2>
        <pre className="mt-2 overflow-auto rounded bg-white p-4 text-xs text-slate-700 shadow-inner">
{JSON.stringify(formData, null, 2)}
        </pre>
      </section>
    </section>
  );
}

export default AdminPage;
