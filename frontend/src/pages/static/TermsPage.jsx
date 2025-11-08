import StaticPlaceholderPage from './StaticPlaceholderPage.jsx';

export default function TermsPage() {
  return (
    <StaticPlaceholderPage title="이용약관" description="infoall 서비스 이용약관을 등록할 수 있는 페이지입니다.">
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
        약관 본문을 마크다운 또는 HTML 형태로 교체해 넣어주세요.
      </div>
    </StaticPlaceholderPage>
  );
}
