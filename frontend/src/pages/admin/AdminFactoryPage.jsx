// frontend/src/pages/admin/AdminFactoryPage.jsx
// 유튜브 스크립트 자동 추출 공정의 정보 구조와 와이어프레임을 구현한 페이지

import { useMemo, useState } from 'react';

const THEME_TABS = [
  '사건/정책',
  '주식정보',
  '육아정보',
  '생활정보',
  '건강정보',
  '공동구매정보',
  '정부지원정보'
];

const SAMPLE_GROUPS = {
  '사건/정책': [
    {
      id: 'policy-main',
      name: '정책 브리핑',
      children: [
        {
          id: 'briefing-news',
          name: '정부브리핑 요약',
          channels: [
            {
              id: '@BriefingKR',
              name: '정책브리핑채널',
              priority: '높음',
              interval: '6시간',
              active: true
            },
            {
              id: '@CivicWatch',
              name: '시민감시네트워크',
              priority: '중간',
              interval: '12시간',
              active: false
            }
          ]
        }
      ]
    },
    {
      id: 'policy-debate',
      name: '이슈 토론',
      children: [
        {
          id: 'debate-progressive',
          name: '진보 시각',
          channels: [
            {
              id: '@ProgressiveVoice',
              name: '진보 시사채널',
              priority: '중간',
              interval: '1일',
              active: true
            }
          ]
        },
        {
          id: 'debate-conservative',
          name: '보수 시각',
          channels: [
            {
              id: '@ConserveTalk',
              name: '보수 시사토크',
              priority: '중간',
              interval: '1일',
              active: true
            }
          ]
        }
      ]
    }
  ],
  생활정보: [
    {
      id: 'life-saving',
      name: '생활 절약 팁',
      children: [
        {
          id: 'saving-grocery',
          name: '장보기',
          channels: [
            {
              id: '@SmartCart',
              name: '알뜰장보기',
              priority: '높음',
              interval: '8시간',
              active: true
            }
          ]
        }
      ]
    }
  ]
};

const SUMMARY_METRICS = [
  { label: '전체 채널', value: '128개', tone: 'indigo' },
  { label: '오늘 신규 영상', value: '42건', tone: 'emerald' },
  { label: '대기 큐', value: '18건', tone: 'amber' },
  { label: '성공/실패', value: '92% / 8%', tone: 'cyan' },
  { label: '마지막 스캔 시각', value: '2024-06-28 09:40', tone: 'slate' }
];

const SUMMARY_ACTIONS = [
  { id: 'scan', label: '지금 스캔' },
  { id: 'extract', label: '지금 추출' },
  { id: 'convert', label: '지금 변환(JSON)' }
];

const EXPLORER_VIDEOS = [
  {
    id: 'vid-01',
    title: '6월 국회 본회의 주요 공약 총정리',
    channel: '정책브리핑채널',
    thumbnail: 'https://dummyimage.com/96x54/111827/fff&text=Thumb',
    publishedAt: '2024-06-28 08:10',
    duration: '14:20',
    language: 'ko',
    captions: true
  },
  {
    id: 'vid-02',
    title: '최저임금위원회 3차 회의 결과 정리',
    channel: '시민감시네트워크',
    thumbnail: 'https://dummyimage.com/96x54/111827/fff&text=Thumb',
    publishedAt: '2024-06-28 06:40',
    duration: '09:32',
    language: 'ko',
    captions: false
  }
];

const QUEUE_ITEMS = [
  {
    id: 'queue-01',
    theme: '사건/정책',
    group: '정책 브리핑',
    channel: '정책브리핑채널',
    title: '6월 국회 본회의 주요 공약 총정리',
    publishedAt: '2024-06-28 08:10',
    status: '대기',
    priority: '높음'
  },
  {
    id: 'queue-02',
    theme: '사건/정책',
    group: '이슈 토론',
    channel: '진보 시사채널',
    title: '3대 개혁 관련 진보/보수 시각 비교',
    publishedAt: '2024-06-28 05:55',
    status: '추출중',
    priority: '중간'
  }
];

const TEMPLATE_ITEMS = [
  {
    id: 'policy-template',
    theme: '사건/정책',
    prompt:
      '주요 공약 요약과 영향: 제목 {{title}}, 발행 {{publishedAt}}. 채널 {{channelName}} 시청자를 위해 5개 핵심 포인트로 요약.',
    schema: '{"issueDraft":"..."}'
  },
  {
    id: 'life-template',
    theme: '생활정보',
    prompt: '생활 꿀팁 요약. {{transcript}}를 분석해 바로 적용 가능한 3단계 가이드를 작성.',
    schema: '{"issueDraft":"..."}'
  }
];

const TEMPLATE_VARIABLES = ['{{title}}', '{{publishedAt}}', '{{channelName}}', '{{transcript}}'];

const RESULT_ITEMS = [
  {
    id: 'result-01',
    title: '6월 국회 본회의 주요 공약 총정리',
    channel: '정책브리핑채널',
    theme: '사건/정책',
    summary: '주요 개혁 법안 3건과 진보/보수 관점에서의 핵심 쟁점을 정리했습니다.',
    tokens: 1680,
    success: true,
    date: '2024-06-28'
  },
  {
    id: 'result-02',
    title: '최저임금위원회 3차 회의 결과 정리',
    channel: '시민감시네트워크',
    theme: '사건/정책',
    summary: '회의 참석자 발언과 합의 사항을 4개 항목으로 정리한 스크립트.',
    tokens: 1320,
    success: false,
    date: '2024-06-27'
  }
];

const LOG_LINES = [
  '[09:40:12] INFO  스캔 작업 시작 - 정책 브리핑 그룹 (6채널)',
  '[09:40:18] INFO  신규 영상 12건 큐에 추가',
  '[09:42:02] WARN  @CivicWatch 영상 자막 미지원 → 추출만 큐에 유지',
  '[09:44:11] ERROR 추출 실패 - @ConserveTalk 2024-06-27 영상 (403 Forbidden)',
  '[09:45:34] INFO  변환 완료 - 8건 JSON 생성'
];

const QUICK_SCHEDULES = {
  scan: '0 */3 * * *',
  extract: '15 */6 * * *',
  convert: '30 */6 * * *'
};

const SAFETY_OPTIONS = {
  requireReview: true,
  maxPerChannel: 3
};

const BALANCE_RATIO = 52;

function ToggleButton({ label, isActive, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isActive}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-300 ${
        isActive
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-100'
          : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs font-normal text-slate-500 dark:text-slate-300">{isActive ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function SummaryBar() {
  const [toggles, setToggles] = useState(() => ({
    scan: false,
    extract: false,
    convert: false
  }));

  const handleToggle = (id) => {
    setToggles((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SUMMARY_METRICS.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {SUMMARY_ACTIONS.map((action) => (
          <ToggleButton
            key={action.id}
            label={action.label}
            isActive={toggles[action.id]}
            onToggle={() => handleToggle(action.id)}
          />
        ))}
      </div>
    </section>
  );
}

function GroupTree({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        선택한 테마에 등록된 그룹이 없습니다. 상단 버튼을 이용해 그룹을 추가해 주세요.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {groups.map((group) => (
        <li key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">하위 채널 {group.children.reduce((acc, child) => acc + child.channels.length, 0)}개</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400"
            >
              상세
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {group.children.map((child) => (
              <li key={child.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{child.name}</p>
                <ul className="mt-2 space-y-2">
                  {child.channels.map((channel) => (
                    <li key={channel.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{channel.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{channel.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100">
                          우선순위 {channel.priority}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">
                          주기 {channel.interval}
                        </span>
                        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                          <input type="checkbox" defaultChecked={channel.active} className="h-3 w-3 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                          활성화
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function ExplorerTab() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">최신 영상 탐색</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">선택한 채널 또는 그룹의 최신 업로드를 확인하고 큐에 담습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
            큐에 담기
          </button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-400">
            제외
          </button>
        </div>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">영상</th>
              <th scope="col" className="px-4 py-3 text-left">채널</th>
              <th scope="col" className="px-4 py-3 text-left">업로드</th>
              <th scope="col" className="px-4 py-3 text-left">길이</th>
              <th scope="col" className="px-4 py-3 text-left">언어/자막</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {EXPLORER_VIDEOS.map((video) => (
              <tr key={video.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <img src={video.thumbnail} alt="영상 썸네일" className="h-14 w-24 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{video.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">#{video.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{video.channel}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{video.publishedAt}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{video.duration}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                  {video.language.toUpperCase()} / {video.captions ? '자막 지원' : '자막 없음'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QueueTab() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">대기열 관리</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">추출과 변환 상태를 한눈에 확인하고 작업을 제어합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-full border border-indigo-500 bg-indigo-500/10 px-3 py-1.5 font-semibold text-indigo-600 transition hover:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200">
            추출 시작
          </button>
          <button type="button" className="rounded-full border border-cyan-500 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-600 transition hover:bg-cyan-500/20 dark:border-cyan-400 dark:text-cyan-200">
            변환(JSON 생성)
          </button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-400">
            삭제
          </button>
          <button type="button" className="rounded-full border border-amber-400 bg-amber-400/10 px-3 py-1.5 font-semibold text-amber-600 transition hover:bg-amber-400/20 dark:border-amber-300 dark:text-amber-200">
            재시도
          </button>
        </div>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">테마</th>
              <th scope="col" className="px-4 py-3 text-left">그룹</th>
              <th scope="col" className="px-4 py-3 text-left">채널</th>
              <th scope="col" className="px-4 py-3 text-left">영상 제목</th>
              <th scope="col" className="px-4 py-3 text-left">업로드</th>
              <th scope="col" className="px-4 py-3 text-left">상태</th>
              <th scope="col" className="px-4 py-3 text-left">우선순위</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {QUEUE_ITEMS.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.theme}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.group}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.channel}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.title}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.publishedAt}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TemplateTab() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">테마별 프롬프트 템플릿</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">공통 변수와 출력 스키마를 확인하고 템플릿을 관리합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
            샘플 스크립트로 테스트
          </button>
          <button type="button" className="rounded-full border border-indigo-500 bg-indigo-500/10 px-3 py-1.5 font-semibold text-indigo-600 transition hover:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200">
            기본값으로 저장
          </button>
        </div>
      </header>
      <div className="space-y-4">
        {TEMPLATE_ITEMS.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{item.theme}</p>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">프롬프트 템플릿</h4>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                issueDraft JSON
              </span>
            </header>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="whitespace-pre-line">{item.prompt}</p>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
                출력 스키마 미리보기: {item.schema}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                사용 가능 변수:
                <span className="ml-1 inline-flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <code
                      key={variable}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"
                    >
                      {variable}
                    </code>
                  ))}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">...</span>
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResultTab() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">결과 요약</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">성공/실패 여부와 날짜별 필터를 통해 결과를 검토합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
            1줄 JSON 복사
          </button>
          <button type="button" className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-200">
            임시글로 발행
          </button>
          <button type="button" className="rounded-full border border-cyan-500 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-600 transition hover:bg-cyan-500/20 dark:border-cyan-400 dark:text-cyan-200">
            Threads용 요약 복사
          </button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
            원문 스크립트 보기
          </button>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {RESULT_ITEMS.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{item.theme}</p>
                <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.channel}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.success
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-100'
              }`}
              >
                {item.success ? '성공' : '실패'}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-900/40">토큰 {item.tokens.toLocaleString()}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-900/40">날짜 {item.date}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LogTab() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">최근 로그</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">스캔·추출·변환 과정의 최근 200줄을 모니터링합니다.</p>
        </div>
        <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
          로그 다운로드
        </button>
      </header>
      <pre className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-950/90 p-4 text-xs text-slate-100 dark:border-slate-700">
        {LOG_LINES.join('\n')}
      </pre>
    </section>
  );
}

function QuickSettings() {
  const [schedules, setSchedules] = useState(QUICK_SCHEDULES);
  const [safety, setSafety] = useState(SAFETY_OPTIONS);
  const [ratio, setRatio] = useState(BALANCE_RATIO);

  const updateSchedule = (key, value) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSafety = (key, value) => {
    setSafety((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <aside className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">스케줄 (크론)</h3>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">스캔 주기</span>
            <input
              type="text"
              value={schedules.scan}
              onChange={(event) => updateSchedule('scan', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">추출 주기</span>
            <input
              type="text"
              value={schedules.extract}
              onChange={(event) => updateSchedule('extract', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">변환 주기</span>
            <input
              type="text"
              value={schedules.convert}
              onChange={(event) => updateSchedule('convert', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">안전 모드</h3>
        <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">검수 전 발행 금지</span>
            <input
              type="checkbox"
              checked={safety.requireReview}
              onChange={(event) => updateSafety('requireReview', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">1일당 채널당 최대 건수</span>
            <input
              type="number"
              min={1}
              value={safety.maxPerChannel}
              onChange={(event) => updateSafety('maxPerChannel', Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">정치 균형 (사건/정책)</h3>
        <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>진보</span>
              <span>보수</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-rose-500" style={{ width: `${ratio}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">진보 {ratio}% / 보수 {100 - ratio}% 노출</p>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">자동 균형 큐 적용</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
          </label>
        </div>
      </section>
    </aside>
  );
}

export default function AdminFactoryPage() {
  const [selectedTheme, setSelectedTheme] = useState(THEME_TABS[0]);
  const [activeTab, setActiveTab] = useState('탐색');

  const groupList = useMemo(() => SAMPLE_GROUPS[selectedTheme] ?? [], [selectedTheme]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">유튜브 스크립트 공장</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          테마별 채널을 관리하고 영상 스캔부터 스크립트 변환까지 한 번에 제어합니다.
        </p>
      </header>

      <SummaryBar />

      <div className="grid gap-6 xl:grid-cols-[300px,1fr,280px]">
        {/* 좌측 패널 */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-indigo-500 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200">
                그룹 추가
              </button>
              <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
                채널 일괄추가
              </button>
              <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
                CSV/JSON 가져오기
              </button>
              <button type="button" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400">
                CSV/JSON 내보내기
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap gap-2">
              {THEME_TABS.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-300 ${
                    selectedTheme === theme
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-200'
                      : 'border border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">그룹 / 채널 트리</h2>
            <GroupTree groups={groupList} />
          </section>
        </aside>

        {/* 중앙 워크벤치 */}
        <section className="space-y-6">
          <nav className="flex flex-wrap gap-2">
            {['탐색', '큐', '템플릿', '결과', '로그'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-300 ${
                  activeTab === tab
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-200'
                    : 'border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {activeTab === '탐색' && <ExplorerTab />}
          {activeTab === '큐' && <QueueTab />}
          {activeTab === '템플릿' && <TemplateTab />}
          {activeTab === '결과' && <ResultTab />}
          {activeTab === '로그' && <LogTab />}
        </section>

        {/* 우측 패널 */}
        <QuickSettings />
      </div>
    </div>
  );
}

