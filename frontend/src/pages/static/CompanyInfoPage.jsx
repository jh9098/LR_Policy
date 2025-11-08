import StaticPlaceholderPage from './StaticPlaceholderPage.jsx';

export default function CompanyInfoPage() {
  return (
    <StaticPlaceholderPage title="회사소개" description="회사 소개 내용을 추후 업데이트할 수 있는 자리입니다.">
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
        회사 연혁, 비전, 핵심 가치 등을 이 영역에 자유롭게 채워주세요.
      </div>
    </StaticPlaceholderPage>
  );
}
