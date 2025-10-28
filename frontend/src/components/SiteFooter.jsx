// frontend/src/components/SiteFooter.jsx
function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs leading-relaxed text-slate-500 sm:px-6 dark:text-slate-300">
        <p>이 사이트는 정책/사건에 대한 공개된 정보와 해석을 요약합니다.</p>
        <p>'배경/맥락'과 '핵심 쟁점'은 확인 가능한 사실과 공개 정보에 기반합니다.</p>
        <p>'주요 시각들'은 일부 진영/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.</p>
        <p>'이게 내 삶에 뭐가 변함?'은 중립적 정리이며 (ChatGPT의 의견)으로 간주해야 합니다.</p>
        <p>투자/법률 조언이 아닙니다.</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
