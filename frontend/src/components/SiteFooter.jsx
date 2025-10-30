// frontend/src/components/SiteFooter.jsx
// 공개 페이지 하단 푸터. Firestore 직행 구조로 전환했다는 안내를 간단히 남긴다.

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} infoall</p>
        <p className="text-xs">
          infoall은 React + Firestore 조합으로 동작하며, 현재는 인증 없이 데이터를 불러옵니다. 프로덕션에서는 Firestore Security Rules와 관리자 인증을 반드시 추가해야 합니다.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
