// frontend/src/components/MediaLandscapeSection.jsx
const MEDIA_CHANNELS = [
  { name: 'TV조선', orientation: '보수', note: '조선일보 계열, 정부·기업 친화' },
  { name: '채널A', orientation: '보수', note: '동아일보 계열, 보수적 논조' },
  { name: 'MBN', orientation: '보수', note: '매일경제 계열, 전통적 보수 성향' },
  { name: '연합뉴스TV', orientation: '중립~보수', note: '국가기관 뉴스통신사, 정부 입장 우호' },
  { name: 'JTBC', orientation: '진보', note: '중앙일보/JTBC지만 보도국, 진보 성향' },
  { name: 'MBC', orientation: '진보', note: '공영방송, 진보 성향' },
  { name: 'TBS', orientation: '진보', note: '서울시 산하, 진보 성향 프로그램 다수' },
  { name: 'KBS', orientation: '중립', note: '공영방송, 중도적' },
  { name: 'SBS', orientation: '중립', note: '민영방송, 상업적 중립 유지' },
  { name: 'YTN', orientation: '중립', note: '24시간 뉴스채널, 비교적 중립적' }
];

function MediaLandscapeSection() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">한국 주요 방송사별 정치 성향 정리</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          방송사별 성향은 고정된 것이 아니라 시기와 정권에 따라 변할 수 있으니 다양한 매체를 참고하는 것이 중요합니다.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <th scope="col" className="px-4 py-3">방송사</th>
              <th scope="col" className="px-4 py-3">정치 성향</th>
              <th scope="col" className="px-4 py-3">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {MEDIA_CHANNELS.map((channel) => (
              <tr key={channel.name} className="text-slate-700 dark:text-slate-200">
                <td className="px-4 py-3 font-medium">{channel.name}</td>
                <td className="px-4 py-3">{channel.orientation}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{channel.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default MediaLandscapeSection;
