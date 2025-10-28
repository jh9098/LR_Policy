// frontend/src/pages/IssuePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

const emptyIssueDetail = {
  id: '',
  title: '',
  date: '',
  summaryFacts: [],
  progressiveFrame: [],
  conservativeFrame: [],
  impactToLife: [],
  sources: []
};

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function IssuePage() {
  const { id } = useParams();
  const [issue, setIssue] = useState(emptyIssueDetail);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchIssueDetail() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('이슈 상세 정보를 불러오지 못했습니다.');
        }

        const data = await response.json();
        setIssue({
          id: data.id ?? id,
          title: data.title ?? '',
          date: data.date ?? '',
          summaryFacts: normalizeList(data.summaryFacts),
          progressiveFrame: normalizeList(data.progressiveFrame),
          conservativeFrame: normalizeList(data.conservativeFrame),
          impactToLife: normalizeList(data.impactToLife),
          sources: normalizeList(data.sources)
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchIssueDetail();

    return () => {
      controller.abort();
    };
  }, [id]);

  const hasData = useMemo(() => {
    return (
      issue.title ||
      issue.date ||
      issue.summaryFacts.length ||
      issue.progressiveFrame.length ||
      issue.conservativeFrame.length ||
      issue.impactToLife.length ||
      issue.sources.length
    );
  }, [issue]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-500">{error}</p>;
  }

  if (!hasData) {
    return <p className="text-sm text-slate-500">표시할 상세 정보가 없습니다.</p>;
  }

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        {issue.date && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issue.date}</p>
        )}
        <h1 className="text-3xl font-bold text-slate-900">{issue.title}</h1>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">확실한 사실</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.summaryFacts.map((fact) => (
              <li key={fact} className="leading-relaxed">
                • {fact}
              </li>
            ))}
          </ul>
          {issue.summaryFacts.length === 0 && (
            <p className="text-sm text-slate-500">등록된 사실이 없습니다.</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">진보 프레임</h2>
            <p className="text-xs font-semibold uppercase text-rose-500">확실하지 않은 사실</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.progressiveFrame.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
          {issue.progressiveFrame.length === 0 && (
            <p className="text-sm text-slate-500">등록된 진보 프레임 정보가 없습니다.</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">보수 프레임</h2>
            <p className="text-xs font-semibold uppercase text-blue-500">확실하지 않은 사실</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.conservativeFrame.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
          {issue.conservativeFrame.length === 0 && (
            <p className="text-sm text-slate-500">등록된 보수 프레임 정보가 없습니다.</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">이게 내 삶에 뭐가 변함?</h2>
            <p className="text-xs font-semibold uppercase text-emerald-500">ChatGPT의 의견</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.impactToLife.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
          {issue.impactToLife.length === 0 && (
            <p className="text-sm text-slate-500">등록된 의견이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">출처</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {issue.sources.map((source) => (
            <li key={source} className="leading-relaxed">
              • {source}
            </li>
          ))}
        </ul>
        {issue.sources.length === 0 && (
          <p className="text-sm text-slate-500">등록된 출처가 없습니다.</p>
        )}
      </section>
    </article>
  );
}

export default IssuePage;
