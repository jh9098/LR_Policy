import StaticPlaceholderPage from './StaticPlaceholderPage.jsx';

export default function PrivacyPolicyPage() {
  return (
    <StaticPlaceholderPage title="개인정보처리방침" description="개인정보 처리 및 보호 정책을 게시할 수 있는 페이지입니다.">
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
        수집 항목, 이용 목적, 보관 기간 등을 상세히 작성해주세요.
      </div>
    </StaticPlaceholderPage>
  );
}
