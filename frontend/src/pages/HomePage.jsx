// frontend/src/pages/HomePage.jsx
import IssueCard from '../components/IssueCard.jsx';

const dummyIssues = [
  {
    id: '2025-10-28-housing-policy',
    title: '부동산 정책 발표 논란',
    date: '2025-10-28',
    summary: '정부의 신규 주택 관련 정책 발표 이후 진보/보수 프레임 충돌'
  },
  {
    id: '2025-10-27-labor-issue',
    title: '노동 관련 파업 이슈',
    date: '2025-10-27',
    summary: '노동단체와 정부의 대립 구도'
  }
];

function HomePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">최근 사건</h1>
        <p className="text-sm text-slate-600">
          주요 이슈에 대해 진보/보수 프레임을 한눈에 비교할 수 있도록 모아둔 아카이브입니다.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        {dummyIssues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}

export default HomePage;
