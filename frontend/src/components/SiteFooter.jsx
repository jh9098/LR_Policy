// frontend/src/components/SiteFooter.jsx
function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/90">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="text-xs font-medium text-slate-500">
          이 사이트는 주요 사건을 중심으로 서로 다른 프레임(진보/보수 등)을 비교하여 보여줍니다.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          여기서 '확실한 사실'은 정부 발표나 공개 문서 등의 확인 가능한 정보입니다.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          '확실하지 않은 사실'은 각 진영의 해석/주장/전망이며 사실로 확정된 것은 아닙니다.
        </p>
        <p className="mt-1 text-xs text-slate-500">'ChatGPT의 의견'은 중립 해석 및 생활/시장 영향 요약입니다.</p>
        <p className="mt-1 text-xs text-slate-500">모든 정리 내용은 참고용이며 법적/투자적 조언이 아닙니다.</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
