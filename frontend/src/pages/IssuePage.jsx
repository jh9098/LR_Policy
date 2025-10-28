// frontend/src/pages/IssuePage.jsx
import { useParams } from 'react-router-dom';

const dummyIssueDetail = {
  id: '2025-10-28-housing-policy',
  title: '부동산 정책 발표 논란',
  date: '2025-10-28',
  summaryFacts: [
    '국토교통부가 2025-10-28에 신규 주택 공급 계획을 발표함',
    '발표 내용에는 공공 분양 물량 확대와 청년 전용 대출 완화가 포함됨'
  ],
  progressiveFrame: [
    '[확실하지 않은 사실] 해당 정책이 단기적으로 전월세 상한제를 강화하는 방향으로 이어질 전망',
    '[확실하지 않은 사실] 민간 건설사 특혜를 줄이고 공공성을 강화하는 계기가 될 것이라는 주장'
  ],
  conservativeFrame: [
    '[확실하지 않은 사실] 공급 확대가 민간 시장을 위축시켜 오히려 주택 가격을 불안정하게 만들 수 있다는 주장',
    '[확실하지 않은 사실] 청년 전용 대출 완화가 도덕적 해이를 유발할 가능성이 있다는 우려'
  ],
  impactToLife: [
    '[ChatGPT의 의견] 청년층은 전세/대출 조건을 다시 확인할 필요가 있고, 무주택 가구는 공공 분양 일정과 자격 요건을 살펴보면 좋습니다.',
    '[ChatGPT의 의견] 자가 보유자라면 향후 공급 물량 증가가 가격 변동에 미칠 영향에 대비해 대출 구조를 점검하는 것이 도움이 됩니다.'
  ],
  sources: [
    '유튜브 채널: 정책24, 업로드일: 2025-10-28, 타임스탬프: 05:32',
    '유튜브 채널: 뉴스이슈줌, 업로드일: 2025-10-28, 타임스탬프: 12:10'
  ]
};

function IssuePage() {
  const { id } = useParams();
  const issue = id === dummyIssueDetail.id ? dummyIssueDetail : dummyIssueDetail;

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issue.date}</p>
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
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">진보 프레임</h2>
          <p className="text-xs font-semibold uppercase text-rose-500">확실하지 않은 사실 / 전망</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.progressiveFrame.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">보수 프레임</h2>
          <p className="text-xs font-semibold uppercase text-blue-500">확실하지 않은 사실 / 전망</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.conservativeFrame.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">이게 내 삶에 뭐가 변함?</h2>
          <p className="text-xs font-semibold uppercase text-emerald-500">ChatGPT의 의견</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {issue.impactToLife.map((item) => (
              <li key={item} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
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
      </section>
    </article>
  );
}

export default IssuePage;
