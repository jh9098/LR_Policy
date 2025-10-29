// frontend/src/components/SiteFooter.jsx
// 공개 페이지 하단 푸터. Firestore 직행 구조로 전환했다는 안내를 간단히 남긴다.

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} 사건 프레임 아카이브</p>
        <p className="text-xs">
          현재는 React 프런트엔드가 Firestore Web SDK로 직접 CRUD를 수행합니다. TODO: 운영 단계에서 접근 제어/보안을 강화해야 합니다.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
