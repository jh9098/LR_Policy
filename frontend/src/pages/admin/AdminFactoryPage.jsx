// frontend/src/pages/admin/AdminFactoryPage.jsx
// /admin/factory 라우트 전용 페이지. 유튜브 스크립트 자동화 플로우를 한눈에 관리한다.

import { useMemo, useState } from 'react';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const SUMMARY_ITEMS = [
  { key: 'channels', label: '전체 채널', value: 128 },
  { key: 'newToday', label: '오늘 신규 영상', value: 36 },
  { key: 'queue', label: '대기 큐', value: 52 },
  { key: 'successRate', label: '성공/실패', value: '92% / 8%' },
  { key: 'lastScan', label: '마지막 스캔 시각', value: '2024-03-12 08:45' }
];

const TOGGLE_ACTIONS = [
  { key: 'scan', label: '지금 스캔' },
  { key: 'extract', label: '지금 추출' },
  { key: 'convert', label: '지금 변환(JSON)' }
];

const THEME_TABS = [
  '사건/정책',
  '주식정보',
  '육아정보',
  '생활정보',
  '건강정보',
  '공동구매정보',
  '정부지원정보'
];

const GROUP_TREE = {
  '사건/정책': [
    {
      name: '정책브리핑',
      children: [
        {
          channelId: 'policy-news-korea',
          title: '정책 뉴스 코리아',
          priority: '상',
          interval: '매 3시간',
          enabled: true
        },
        {
          channelId: 'policy-brief-asia',
          title: '아시아 정책 브리핑',
          priority: '중',
          interval: '매 6시간',
          enabled: false
        }
      ]
    },
    {
      name: '국회/정당',
      children: [
        {
          channelId: 'assembly-watch',
          title: '국회 실시간',
          priority: '중',
          interval: '매일 09:00',
          enabled: true
        }
      ]
    }
  ],
  생활정보: [
    {
      name: '살림/노하우',
      children: [
        {
          channelId: 'life-hacks-tv',
          title: '생활 꿀팁 TV',
          priority: '중',
          interval: '매 12시간',
          enabled: true
        }
      ]
    }
  ]
};

const WORKBENCH_TABS = [
  { key: 'explore', label: '탐색(최신 영상 검색)' },
  { key: 'queue', label: '큐(대기열)' },
  { key: 'template', label: '템플릿' },
  { key: 'result', label: '결과' },
  { key: 'log', label: '로그' }
];

const SAMPLE_VIDEOS = [
  {
    id: 'yt-001',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    title: '2024 정책 브리핑 - 아침 회의 요약',
    uploadedAt: '3시간 전',
    duration: '12:34',
    language: 'ko',
    captions: '자동'
  },
  {
    id: 'yt-002',
    thumbnail: 'https://img.youtube.com/vi/M3w1_EifP7Y/mqdefault.jpg',
    title: '정부 지원금 총정리 (3월 업데이트)',
    uploadedAt: '5시간 전',
    duration: '18:20',
    language: 'ko',
    captions: '제공'
  }
];

const SAMPLE_QUEUE = [
  {
    id: 'queue-001',
    theme: '사건/정책',
    group: '정책브리핑',
    channel: '정책 뉴스 코리아',
    title: '2024 정책 브리핑 - 아침 회의 요약',
    uploadedAt: '2024-03-12 07:30',
    status: '대기',
    priority: '상'
  },
  {
    id: 'queue-002',
    theme: '정부지원정보',
    group: '지원금/복지',
    channel: '복지 핫라인',
    title: '서민 지원금 10가지 신청방법',
    uploadedAt: '2024-03-11 23:15',
    status: '추출중',
    priority: '중'
  }
];

const SAMPLE_RESULTS = [
  {
    id: 'result-001',
    title: '2024 정책 브리핑 - 아침 회의 요약',
    channel: '정책 뉴스 코리아',
    theme: '사건/정책',
    summary: '주요 공공정책과 예산 이슈를 5분 안에 정리한 스크립트입니다.',
    tokens: 1876,
    status: '성공',
    date: '2024-03-12'
  },
  {
    id: 'result-002',
    title: '정부 지원금 총정리 (3월 업데이트)',
    channel: '복지 핫라인',
    theme: '정부지원정보',
    summary: '3월 최신 지원금 제도, 자격 요건, 신청 일정을 항목별 JSON으로 정리했습니다.',
    tokens: 2140,
    status: '실패',
    date: '2024-03-11'
  }
];

const SAMPLE_LOGS = [
  '[08:45:12] [SCAN] policy-news-korea 3개의 새 영상을 큐에 추가했습니다.',
  '[08:50:21] [EXTRACT] yt-002 스크립트 추출 완료 (12,340 tokens).',
  '[08:52:07] [CONVERT][WARN] result-002 JSON Validation failed: missing field summary'
];

export default function AdminFactoryPage() {
  const [activeTheme, setActiveTheme] = useState(THEME_TABS[0]);
  const [activeTab, setActiveTab] = useState(WORKBENCH_TABS[0].key);
  const [activeToggles, setActiveToggles] = useState(() => new Set());

  const availableGroups = useMemo(() => GROUP_TREE[activeTheme] ?? [], [activeTheme]);

  const handleToggle = (key) => {
    setActiveToggles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-slate-700 dar
k:bg-slate-900/70">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SUMMARY_ITEMS.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-white/60 p-4 text-sm dark:border-slate-700 dar
k:bg-slate-900/60">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {TOGGLE_ACTIONS.map((action) => {
              const isActive = activeToggles.has(action.key);
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => handleToggle(action.key)}
                  className={classNames(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                    isActive
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100'
                  )}
                  aria-pressed={isActive}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
        {/* 좌측 패널 - 테마 & 채널그룹 */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">테마</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {THEME_TABS.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setActiveTheme(theme)}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                    activeTheme === theme
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100'
                  )}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 tran
sition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:
border-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100">
                그룹 추가
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 tran
sition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:
border-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100">
                채널 일괄추가
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 tran
sition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:
border-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100">
                CSV/JSON 가져오기·내보내기
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {availableGroups.length > 0 ? (
                availableGroups.map((group) => (
                  <div key={group.name} className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-
700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{group.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">하위 채널 {group.children.length}개</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:bo
rder-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-
indigo-100"
                      >
                        편집
                      </button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {group.children.map((channel) => (
                        <li key={channel.channelId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs da
rk:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-700 dark:text-slate-100">{channel.title}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">ID: {channel.channelId}</p>
                            </div>
                            <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>활성</span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border border-slate-300 text-indigo-500 focus:ring-indigo-500 dark:border-slate-600"
                                defaultChecked={channel.enabled}
                                aria-label={`${channel.title} 활성화`}
                              />
                            </label>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>우선순위: <strong className="font-semibold text-slate-700 dark:text-slate-200">{channel.priority}</strong></span>
                            <span>주기: {channel.interval}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">선택된 테마에 등록된 그룹이 없습니다.</p>
              )}
            </div>
          </div>
        </aside>

        {/* 중앙 워크벤치 */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-2">
              {WORKBENCH_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={classNames(
                    'rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                    activeTab === tab.key
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-transparent text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/80">
            {activeTab === 'explore' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>선택된 그룹: <strong className="text-slate-800 dark:text-slate-100">{availableGroups[0]?.name ?? '없음'}</strong></span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      큐에 담기
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      제외
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          썸네일
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          제목
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          업로드
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          길이
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          언어/자막
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {SAMPLE_VIDEOS.map((video) => (
                        <tr key={video.id} className="hover:bg-indigo-50/60 dark:hover:bg-slate-800">
                          <td className="px-4 py-3">
                            <img src={video.thumbnail} alt="영상 썸네일" className="h-14 w-24 rounded-lg object-cover" />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{video.title}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{video.uploadedAt}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{video.duration}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{video.language} / {video.captions}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                                큐에 담기
                              </button>
                              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-100">
                                제외
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>총 {SAMPLE_QUEUE.length}건 대기 중</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      추출 시작
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      변환(JSON 생성)
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-100">
                      삭제
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-100">
                      재시도
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                      <tr>
                        {['테마', '그룹', '채널', '영상제목', '업로드시각', '상태', '우선순위'].map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {SAMPLE_QUEUE.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/60 dark:hover:bg-slate-800">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.theme}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.group}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.channel}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-100">{item.title}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.uploadedAt}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'template' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">테마별 프롬프트 템플릿</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    변수: {'{'}{'{'}title{'}'}{'}'}, {'{'}{'{'}publishedAt{'}'}{'}'}, {'{'}{'{'}channelName{'}'}{'}'}, {'{'}{'{'}transcript{'}'}{'}'} …
                  </p>
                  <textarea
                    className="mt-3 h-40 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    defaultValue={`[${activeTheme}] 테마 스크립트를 JSON으로 요약해줘.\n- 제목: {{{title}}}\n- 업로드: {{{publishedAt}}}\n- 채널: {{{channelName}}}\n- 스크립트: {{{transcript}}}\n- 출력은 InfoAll.issueDraft 스키마를 준수한 1줄 JSON.`}
                  />
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      샘플 스크립트로 테스트
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      기본값으로 저장
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <h4 className="text-base font-semibold text-slate-700 dark:text-slate-100">출력 스키마 미리보기</h4>
                  <pre className="mt-3 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-emerald-200 dark:bg-black/60">
{`{
  "issueDraft": {
    "title": "string",
    "theme": "${activeTheme}",
    "summary": "string",
    "transcript": "string",
    "tags": ["string"],
    "meta": {
      "publishedAt": "ISO8601",
      "channelId": "string"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'result' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <span>상태</span>
                      <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        <option>전체</option>
                        <option>성공</option>
                        <option>실패</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <span>날짜</span>
                      <input type="date" className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                      1줄 JSON 복사
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-100">
                      임시글로 발행
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-100">
                      Threads용 요약 복사
                    </button>
                    <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-100">
                      원문 스크립트 보기
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {SAMPLE_RESULTS.map((result) => (
                    <article key={result.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <header className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{result.title}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {result.channel} · {result.theme} · {result.date}
                          </p>
                        </div>
                        <span
                          className={classNames(
                            'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
                            result.status === '성공'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-400/60 dark:bg-rose-500/10 dark:text-rose-200'
                          )}
                        >
                          {result.status}
                        </span>
                      </header>
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{result.summary}</p>
                      <footer className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>토큰 길이: {result.tokens.toLocaleString()}</span>
                        <button type="button" className="rounded-lg border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                          세부 JSON
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'log' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>최근 200줄 중 상위 {SAMPLE_LOGS.length}줄 미리보기</span>
                  <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-100">
                    로그 다운로드
                  </button>
                </div>
                <pre className="h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-950/90 p-4 text-xs text-emerald-200 dark:border-slate-700 dark:bg-black/70">
                  {SAMPLE_LOGS.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* 우측 패널 - 빠른 설정 */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-100">스케줄 (크론)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <label className="flex items-center justify-between gap-3">
                <span>스캔 주기</span>
                <input type="text" defaultValue="0 */3 * * *" className="w-40 rounded-lg border border-slate-300 px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>추출 주기</span>
                <input type="text" defaultValue="15 * * * *" className="w-40 rounded-lg border border-slate-300 px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>변환 주기</span>
                <input type="text" defaultValue="30 * * * *" className="w-40 rounded-lg border border-slate-300 px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-100">안전 모드</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <label className="flex items-center justify-between gap-3">
                <span>검수 전 발행 금지</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border border-slate-300 text-indigo-500 focus:ring-indigo-500 dark:border-slate-600" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>1일당 채널당 최대 건수</span>
                <input type="number" min="1" defaultValue={5} className="w-20 rounded-lg border border-slate-300 px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 da
rk:bg-slate-900/70">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-100">정치 균형 (사건/정책)</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span>진보</span>
                  <span>보수</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400" style={{ width: '55%' }} aria-hidden />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">진보 55% · 보수 45%</p>
              </div>
              <label className="flex items-center justify-between gap-3 text-xs">
                <span>자동 균형 큐</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border border-slate-300 text-indigo-500 focus:ring-indigo-500 dark:border-slate-600" />
              </label>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
