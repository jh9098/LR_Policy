// frontend/src/pages/admin/AdminFactoryPage.jsx
// Firestore 실데이터 연동을 염두에 둔 유튜브 스크립트 공정 대시보드

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEME_CONFIG, getThemeById, getThemeLabel } from '../../constants/themeConfig.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  addFactoryQueueItems,
  deleteFactoryQueueItems,
  formatFactoryInterval,
  getFactoryBalanceSettings,
  getFactoryDashboard,
  getFactoryExplorerItems,
  getFactoryLogs,
  getFactoryQueueItems,
  getFactoryResults,
  getFactorySafetyOptions,
  getFactorySchedules,
  getFactoryTemplates,
  getFactoryThemeConfigs,
  saveFactoryBalanceSettings,
  saveFactorySafetyOptions,
  saveFactorySchedules,
  saveFactoryTemplate,
  saveFactoryThemeConfig,
  updateFactoryDashboard,
  updateFactoryExplorerItem,
  updateFactoryQueueItems
} from '../../firebaseClient.js';

const TAB_ITEMS = [
  { id: 'explorer', label: '탐색 (최신 영상 검색)' },
  { id: 'queue', label: '큐 (대기열)' },
  { id: 'templates', label: '템플릿' },
  { id: 'results', label: '결과' },
  { id: 'logs', label: '로그' }
];

const QUEUE_STATUS_LABELS = {
  pending: '대기',
  extracting: '추출중',
  completed: '완료',
  error: '오류'
};

const QUEUE_STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'extracting', label: '추출중' },
  { value: 'completed', label: '완료' },
  { value: 'error', label: '오류' }
];

const RESULT_STATUS_LABELS = {
  success: '성공',
  failure: '실패',
  skipped: '건너뜀'
};

const RESULT_STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'failure', label: '실패' }
];

const METRIC_TONE_STYLES = {
  indigo: {
    container: 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/40',
    label: 'text-indigo-600 dark:text-indigo-300'
  },
  emerald: {
    container: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/40',
    label: 'text-emerald-600 dark:text-emerald-300'
  },
  amber: {
    container: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/40',
    label: 'text-amber-600 dark:text-amber-300'
  },
  cyan: {
    container: 'border-cyan-200 bg-cyan-50 dark:border-cyan-900/40 dark:bg-cyan-950/40',
    label: 'text-cyan-600 dark:text-cyan-300'
  },
  slate: {
    container: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800',
    label: 'text-slate-600 dark:text-slate-300'
  },
  default: {
    container: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800',
    label: 'text-slate-600 dark:text-slate-300'
  }
};

function formatDateTime(date) {
  if (!date) return '기록 없음';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch (error) {
    return '기록 없음';
  }
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('ko-KR');
}

function buildUserLabel(user) {
  if (!user) return '관리자';
  return user.email || user.displayName || user.uid || '관리자';
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function copyToClipboard(text) {
  if (!navigator?.clipboard) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
  return navigator.clipboard.writeText(text);
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function createEmptyTheme(themeId) {
  return {
    themeId,
    groups: [],
    updatedAt: null,
    updatedBy: ''
  };
}

function getChannelIntervalLabel(channel) {
  if (!channel?.intervalMinutes) {
    return '주기 미정';
  }
  return formatFactoryInterval(channel.intervalMinutes);
}

function getThemeTabLabel(themeId) {
  const theme = getThemeById(themeId);
  return theme?.label ?? themeId;
}

function ResultTranscriptModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">원문 스크립트</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{result.title || '제목 미상'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{result.channelName || '채널 정보 없음'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            닫기
          </button>
        </header>
        <section className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {result.transcript ? result.transcript.split('\n').map((line, index) => (
            <Fragment key={`${result.id}-line-${index}`}>
              {line}
              <br />
            </Fragment>
          )) : (
            <p className="text-slate-500 dark:text-slate-400">저장된 스크립트가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function FactoryHelpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="flex w-full max-w-4xl flex-col gap-5 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">사용 가이드</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">YouTube 스크립트 공정 매뉴얼</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              큐/탐색 데이터를 수동 워커(예: Tkinter 추출 도구)와 연동하는 절차를 정리했습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            닫기
          </button>
        </header>
        <section className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          <p>
            자동 워커가 아직 붙어있지 않기 때문에, 제공해주신 Tkinter 기반 추출 프로그램을 이용해 영상을 수동으로 처리해야 합니다.
            아래 순서를 따라가면 공장 대시보드와 오프라인 프로그램을 맞물리게 사용할 수 있습니다.
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <strong>탐색 탭</strong>에서 신규 영상을 고른 뒤 <strong>큐에 담기</strong> 버튼을 눌러 Firestore 대기열을 채웁니다.
              필요하다면 제외/플래그 처리를 이용해 원치 않는 영상을 숨길 수 있습니다.
            </li>
            <li>
              <strong>큐 탭</strong>에서 작업할 항목을 선택하고 상단의 <strong>URL 복사</strong> 또는 <strong>TXT 다운로드</strong> 버튼을 사용해 YouTube 주소 목록을 확보합니다.
              각 항목은
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">https://www.youtube.com/watch?v=&lt;videoId&gt;</code>
              형식으로 내보냅니다.
            </li>
            <li>
              Tkinter 프로그램을 실행한 뒤 상단의 “유튜브 URL” 입력 영역에 복사한 주소들을 붙여넣습니다.
              필요 시 <strong>쿠키 선택</strong> 버튼으로 인증 쿠키를 연결하고, <strong>추출 시작</strong>을 눌러 자막을 내려받습니다.
              프로그램 코드는 API Key 설정, 자막 정제(<code>clean_vtt</code>) 및 파일 저장 경로(<code>추출</code> 폴더) 설정을 이미 포함하고 있습니다.
            </li>
            <li>
              추출이 끝나면 생성된 TXT 파일을 검토한 뒤, 공장 결과 탭의 <strong>임시글 전환</strong> 기능을 이용해 새 이슈 등록으로 이어가거나 JSON/Threads 요약 복사를 활용합니다.
            </li>
          </ol>
          <p>
            위 과정을 반복하면서 대시보드 토글(스캔/추출/변환)을 켜두면 현재 작업 단계가 Firestore에 기록되어 다른 팀원도 진행 상황을 한눈에 확인할 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}

function AdminFactoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updatedBy = useMemo(() => buildUserLabel(user), [user]);

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardSaving, setDashboardSaving] = useState(false);

  const [themeConfigs, setThemeConfigs] = useState({});
  const [themeLoading, setThemeLoading] = useState(true);
  const [themeError, setThemeError] = useState('');
  const [dirtyThemes, setDirtyThemes] = useState({});

  const [selectedThemeId, setSelectedThemeId] = useState(() => THEME_CONFIG[0]?.id ?? 'policy');
  const [templateThemeId, setTemplateThemeId] = useState(() => THEME_CONFIG[0]?.id ?? 'policy');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [activeTab, setActiveTab] = useState('explorer');

  const [explorerItems, setExplorerItems] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerError, setExplorerError] = useState('');
  const [explorerGroupFilter, setExplorerGroupFilter] = useState('');
  const [explorerChannelFilter, setExplorerChannelFilter] = useState('');
  const [explorerShowExcluded, setExplorerShowExcluded] = useState(false);
  const [explorerSelection, setExplorerSelection] = useState([]);

  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [queueSelection, setQueueSelection] = useState([]);
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');

  const [templates, setTemplates] = useState({ items: {}, schemaPreview: '', updatedAt: null, updatedBy: '' });
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [resultStatusFilter, setResultStatusFilter] = useState('all');
  const [resultDateFrom, setResultDateFrom] = useState('');
  const [resultDateTo, setResultDateTo] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [schedules, setSchedules] = useState({ scanCron: '', extractCron: '', convertCron: '' });
  const [safety, setSafety] = useState({ requireReviewBeforePublish: true, dailyMaxPerChannel: 3 });
  const [balance, setBalance] = useState({ progressiveWeight: 50, conservativeWeight: 50, autoBalanceEnabled: true, totalWeight: 100 });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      try {
        setDashboardLoading(true);
        setThemeLoading(true);
        setTemplateLoading(true);
        setSettingsLoading(true);
        const [dashboardData, themeData, templateData, scheduleData, safetyData, balanceData] = await Promise.all([
          getFactoryDashboard(),
          getFactoryThemeConfigs(),
          getFactoryTemplates(),
          getFactorySchedules(),
          getFactorySafetyOptions(),
          getFactoryBalanceSettings()
        ]);
        if (!mounted) return;
        setDashboard(dashboardData);
        setThemeConfigs(themeData);
        setTemplates(templateData);
        setSchedules(scheduleData);
        setSafety(safetyData);
        setBalance(balanceData);
        const firstTheme = THEME_CONFIG[0]?.id;
        if (firstTheme) {
          setSelectedThemeId(firstTheme);
          const firstGroups = ensureArray(themeData[firstTheme]?.groups);
          if (firstGroups.length > 0) {
            setSelectedGroupId(firstGroups[0].id);
          }
        }
      } catch (error) {
        console.error('공장 초기 데이터 불러오기 실패:', error);
        if (mounted) {
          setDashboardError('대시보드를 불러오지 못했습니다. Firestore 연결을 확인하세요.');
          setThemeError('테마/채널 구성을 불러오지 못했습니다.');
          setTemplateError('프롬프트 템플릿을 불러오지 못했습니다.');
          setSettingsError('빠른 설정 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) {
          setDashboardLoading(false);
          setThemeLoading(false);
          setTemplateLoading(false);
          setSettingsLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadExplorer() {
      try {
        setExplorerLoading(true);
        setExplorerError('');
        const items = await getFactoryExplorerItems({ limitCount: 120 });
        if (!mounted) return;
        setExplorerItems(items);
      } catch (error) {
        console.error('탐색 데이터 불러오기 실패:', error);
        if (mounted) setExplorerError('탐색 목록을 불러오지 못했습니다. Firestore 권한을 확인하세요.');
      } finally {
        if (mounted) setExplorerLoading(false);
      }
    }

    loadExplorer();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadQueue() {
      try {
        setQueueLoading(true);
        setQueueError('');
        const items = await getFactoryQueueItems({ limitCount: 120 });
        if (!mounted) return;
        setQueueItems(items);
      } catch (error) {
        console.error('큐 불러오기 실패:', error);
        if (mounted) setQueueError('큐 데이터를 불러오지 못했습니다. Firestore 권한을 확인하세요.');
      } finally {
        if (mounted) setQueueLoading(false);
      }
    }

    loadQueue();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadResultsData() {
      try {
        setResultsLoading(true);
        setResultsError('');
        const items = await getFactoryResults({ limitCount: 120 });
        if (!mounted) return;
        setResults(items);
      } catch (error) {
        console.error('결과 불러오기 실패:', error);
        if (mounted) setResultsError('결과 데이터를 불러오지 못했습니다. Firestore 권한을 확인하세요.');
      } finally {
        if (mounted) setResultsLoading(false);
      }
    }

      loadResultsData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLogsData() {
      try {
        setLogsLoading(true);
        setLogsError('');
        const items = await getFactoryLogs({ limitCount: 200 });
        if (!mounted) return;
        setLogs(items);
      } catch (error) {
        console.error('로그 불러오기 실패:', error);
        if (mounted) setLogsError('로그 데이터를 불러오지 못했습니다. Firestore 권한을 확인하세요.');
      } finally {
        if (mounted) setLogsLoading(false);
      }
    }

    loadLogsData();
    return () => {
      mounted = false;
    };
  }, []);

  const summaryMetrics = useMemo(() => {
    if (!dashboard) {
      return [
        { label: '전체 채널', value: '0개', tone: 'indigo' },
        { label: '오늘 신규 영상', value: '0건', tone: 'emerald' },
        { label: '대기 큐', value: '0건', tone: 'amber' },
        { label: '성공/실패', value: '0% / 0%', tone: 'cyan' },
        { label: '마지막 스캔 시각', value: '기록 없음', tone: 'slate' }
      ];
    }
    const { totalChannels, newVideosToday, queueSize, successCount, failureCount, lastScanAt } = dashboard.summary;
    const totalRuns = successCount + failureCount;
    const successPercent = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;
    const failurePercent = totalRuns > 0 ? 100 - successPercent : 0;
    return [
      { label: '전체 채널', value: `${formatNumber(totalChannels)}개`, tone: 'indigo' },
      { label: '오늘 신규 영상', value: `${formatNumber(newVideosToday)}건`, tone: 'emerald' },
      { label: '대기 큐', value: `${formatNumber(queueSize)}건`, tone: 'amber' },
      { label: '성공/실패', value: `${successPercent}% / ${failurePercent}%`, tone: 'cyan' },
      { label: '마지막 스캔 시각', value: formatDateTime(lastScanAt), tone: 'slate' }
    ];
  }, [dashboard]);

  const themeGroups = useMemo(() => ensureArray(themeConfigs[selectedThemeId]?.groups), [themeConfigs, selectedThemeId]);

  useEffect(() => {
    if (!selectedGroupId && themeGroups.length > 0) {
      setSelectedGroupId(themeGroups[0].id);
    }
  }, [selectedGroupId, themeGroups]);

  const availableChannels = useMemo(() => {
    const channels = [];
    themeGroups.forEach((group) => {
      ensureArray(group.channels).forEach((channel) => {
        channels.push({
          id: channel.id,
          name: channel.name,
          groupId: group.id,
          groupName: group.name
        });
      });
      ensureArray(group.children).forEach((child) => {
        ensureArray(child.channels).forEach((channel) => {
          channels.push({
            id: channel.id,
            name: channel.name,
            groupId: group.id,
            groupName: child.name || group.name,
            childId: child.id
          });
        });
      });
    });
    return channels;
  }, [themeGroups]);

  const filteredExplorerItems = useMemo(() => {
    return explorerItems.filter((item) => {
      if (selectedThemeId && item.themeId && item.themeId !== selectedThemeId) {
        return false;
      }
      if (explorerGroupFilter && item.groupId && item.groupId !== explorerGroupFilter) {
        return false;
      }
      if (explorerChannelFilter && item.channelId && item.channelId !== explorerChannelFilter) {
        return false;
      }
      if (!explorerShowExcluded && item.excluded) {
        return false;
      }
      return true;
    });
  }, [explorerItems, selectedThemeId, explorerGroupFilter, explorerChannelFilter, explorerShowExcluded]);

  const filteredQueueItems = useMemo(() => {
    return queueItems.filter((item) => {
      if (selectedThemeId && item.themeId && item.themeId !== selectedThemeId) {
        return false;
      }
      if (queueStatusFilter !== 'all' && item.status && item.status !== queueStatusFilter) {
        return false;
      }
      return true;
    });
  }, [queueItems, queueStatusFilter, selectedThemeId]);

  const filteredResults = useMemo(() => {
    const fromDate = resultDateFrom ? new Date(resultDateFrom) : null;
    const toDate = resultDateTo ? new Date(resultDateTo) : null;
    return results.filter((item) => {
      if (selectedThemeId && item.themeId && item.themeId !== selectedThemeId) {
        return false;
      }
      if (resultStatusFilter !== 'all' && item.status && item.status !== resultStatusFilter) {
        return false;
      }
      if (fromDate && item.completedAt && item.completedAt < fromDate) {
        return false;
      }
      if (toDate && item.completedAt && item.completedAt > new Date(toDate.getTime() + 24 * 60 * 60 * 1000)) {
        return false;
      }
      return true;
    });
  }, [results, selectedThemeId, resultStatusFilter, resultDateFrom, resultDateTo]);

  const explorerSelectionSet = useMemo(() => new Set(explorerSelection), [explorerSelection]);
  const queueSelectionSet = useMemo(() => new Set(queueSelection), [queueSelection]);

  const toggleExplorerSelection = (id) => {
    setExplorerSelection((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleQueueSelection = (id) => {
    setQueueSelection((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const updateThemeConfig = (themeId, updater) => {
    setThemeConfigs((prev) => {
      const current = prev[themeId] ?? createEmptyTheme(themeId);
      const next = updater(current);
      return { ...prev, [themeId]: next };
    });
    setDirtyThemes((prev) => ({ ...prev, [themeId]: true }));
  };

  const handleToggleChannelActive = (themeId, target) => {
    updateThemeConfig(themeId, (theme) => ({
      ...theme,
      groups: ensureArray(theme.groups).map((group) => {
        if (group.id !== target.groupId) return group;
        if (target.childId) {
          return {
            ...group,
            children: ensureArray(group.children).map((child) => {
              if (child.id !== target.childId) return child;
              return {
                ...child,
                channels: ensureArray(child.channels).map((channel) =>
                  channel.id === target.channelId ? { ...channel, active: !channel.active } : channel
                )
              };
            })
          };
        }
        return {
          ...group,
          channels: ensureArray(group.channels).map((channel) =>
            channel.id === target.channelId ? { ...channel, active: !channel.active } : channel
          )
        };
      })
    }));
  };

  const handleChannelFieldChange = (themeId, target, field, value) => {
    updateThemeConfig(themeId, (theme) => ({
      ...theme,
      groups: ensureArray(theme.groups).map((group) => {
        if (group.id !== target.groupId) return group;
        const updateChannelList = (channels) =>
          ensureArray(channels).map((channel) => (channel.id === target.channelId ? { ...channel, [field]: value } : channel));
        if (target.childId) {
          return {
            ...group,
            children: ensureArray(group.children).map((child) => {
              if (child.id !== target.childId) return child;
              return { ...child, channels: updateChannelList(child.channels) };
            })
          };
        }
        return { ...group, channels: updateChannelList(group.channels) };
      })
    }));
  };
  const handleAddGroup = () => {
    const name = window.prompt('추가할 그룹 이름을 입력하세요.');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    updateThemeConfig(selectedThemeId, (theme) => ({
      ...theme,
      groups: [
        ...ensureArray(theme.groups),
        {
          id: `group-${Date.now()}`,
          name: trimmed,
          description: '',
          channels: [],
          children: []
        }
      ]
    }));
  };

  const handleBulkAddChannels = () => {
    if (!selectedGroupId) {
      window.alert('채널을 추가할 그룹을 먼저 선택하세요.');
      return;
    }
    const input = window.prompt('채널ID,채널명 형식으로 줄바꿈하여 입력하세요.');
    if (!input) return;
    const lines = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const parsed = lines
      .map((line) => {
        const [id = '', name = ''] = line.split(/[\s,]+/);
        return { id: id.trim(), name: name.trim() };
      })
      .filter((item) => item.id);
    if (parsed.length === 0) {
      window.alert('추가할 채널ID를 찾지 못했습니다.');
      return;
    }
    updateThemeConfig(selectedThemeId, (theme) => ({
      ...theme,
      groups: ensureArray(theme.groups).map((group) => {
        if (group.id !== selectedGroupId) return group;
        const nextChannels = [
          ...ensureArray(group.channels),
          ...parsed.map((channel) => ({
            id: channel.id,
            name: channel.name,
            priority: '중간',
            intervalMinutes: 720,
            active: true,
            lastSyncedAt: null,
            note: ''
          }))
        ];
        return { ...group, channels: nextChannels };
      })
    }));
  };

  const handleExportChannels = () => {
    const theme = themeConfigs[selectedThemeId] ?? createEmptyTheme(selectedThemeId);
    downloadText(`factory_channels_${selectedThemeId}.json`, JSON.stringify(theme, null, 2));
  };

  const handleImportChannels = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        throw new Error('JSON 구조가 올바르지 않습니다.');
      }
      updateThemeConfig(selectedThemeId, () => ({
        themeId: selectedThemeId,
        groups: ensureArray(data.groups),
        updatedAt: null,
        updatedBy: updatedBy || ''
      }));
      window.alert('가져오기가 완료되었습니다. 저장 버튼을 눌러 Firestore에 반영하세요.');
    } catch (error) {
      console.error('채널 구성 가져오기 실패:', error);
      window.alert('JSON 파싱에 실패했습니다. 파일 형식을 확인하세요.');
    }
  };

  const handleSaveTheme = async () => {
    try {
      setThemeError('');
      const current = themeConfigs[selectedThemeId] ?? createEmptyTheme(selectedThemeId);
      await saveFactoryThemeConfig(selectedThemeId, current, { updatedBy });
      setDirtyThemes((prev) => ({ ...prev, [selectedThemeId]: false }));
      window.alert('채널 구성을 저장했습니다.');
    } catch (error) {
      console.error('채널 구성 저장 실패:', error);
      setThemeError('채널 구성을 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleDashboardToggle = async (key) => {
    if (!dashboard) return;
    const nextToggles = { ...dashboard.toggles, [key]: !dashboard.toggles[key] };
    try {
      setDashboardSaving(true);
      const updated = await updateFactoryDashboard({ toggles: nextToggles, updatedBy });
      setDashboard(updated);
    } catch (error) {
      console.error('토글 업데이트 실패:', error);
      setDashboardError('요청 토글 상태를 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setDashboardSaving(false);
    }
  };

  const handleQueueSelectedFromExplorer = async () => {
    if (explorerSelection.length === 0) {
      window.alert('큐에 담을 영상을 선택하세요.');
      return;
    }
    const itemsToQueue = explorerItems
      .filter((item) => explorerSelectionSet.has(item.id))
      .map((item) => ({
        themeId: item.themeId || selectedThemeId,
        themeLabel: item.themeLabel || getThemeLabel(item.themeId || selectedThemeId),
        groupId: item.groupId || explorerGroupFilter || selectedGroupId,
        groupName: item.groupName || '',
        channelId: item.channelId || '',
        channelName: item.channelName || '',
        videoId: item.videoId || '',
        videoTitle: item.videoTitle || '',
        publishedAt: item.publishedAt || null,
        priority: '중간',
        status: 'pending'
      }));
    if (itemsToQueue.length === 0) {
      window.alert('큐에 추가할 수 있는 항목이 없습니다.');
      return;
    }
    try {
      await addFactoryQueueItems(itemsToQueue, { requestedBy: updatedBy });
      setExplorerSelection([]);
      const refreshedQueue = await getFactoryQueueItems({ limitCount: 120 });
      setQueueItems(refreshedQueue);
      window.alert(`${itemsToQueue.length}개의 영상을 큐에 추가했습니다.`);
    } catch (error) {
      console.error('큐 추가 실패:', error);
      window.alert('큐에 추가하지 못했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleExcludeExplorerItems = async () => {
    if (explorerSelection.length === 0) {
      window.alert('제외할 영상을 선택하세요.');
      return;
    }
    try {
      await Promise.all(
        explorerItems
          .filter((item) => explorerSelectionSet.has(item.id))
          .map((item) => updateFactoryExplorerItem(item.id, { excluded: true, flagged: true }))
      );
      setExplorerSelection([]);
      const refreshed = await getFactoryExplorerItems({ limitCount: 120 });
      setExplorerItems(refreshed);
      window.alert('선택한 영상을 제외 처리했습니다.');
    } catch (error) {
      console.error('탐색 제외 실패:', error);
      window.alert('영상 제외 처리에 실패했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleQueueAction = async (action) => {
    if (queueSelection.length === 0) {
      window.alert('작업할 큐 항목을 선택하세요.');
      return;
    }
    try {
      if (action === 'delete') {
        await deleteFactoryQueueItems(queueSelection);
      } else if (action === 'retry') {
        await updateFactoryQueueItems(queueSelection, { status: 'pending', errorMessage: '', startedAt: null, completedAt: null });
      } else if (action === 'extract') {
        await updateFactoryQueueItems(queueSelection, { status: 'extracting', startedAt: 'now', errorMessage: '' });
      } else if (action === 'convert') {
        await updateFactoryQueueItems(queueSelection, { status: 'completed', completedAt: 'now' });
      }
      setQueueSelection([]);
      const refreshedQueue = await getFactoryQueueItems({ limitCount: 120 });
      setQueueItems(refreshedQueue);
      window.alert('큐 상태를 갱신했습니다.');
    } catch (error) {
      console.error('큐 작업 실패:', error);
      window.alert('큐 작업 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const buildVideoUrl = (videoId) => {
    if (!videoId) return '';
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  const handleQueueCopyUrls = async () => {
    if (queueSelection.length === 0) {
      window.alert('먼저 큐에서 내보낼 항목을 선택하세요.');
      return;
    }
    const urls = queueItems
      .filter((item) => queueSelectionSet.has(item.id))
      .map((item) => buildVideoUrl(item.videoId))
      .filter(Boolean);
    if (urls.length === 0) {
      window.alert('선택한 항목에서 유효한 YouTube ID를 찾지 못했습니다.');
      return;
    }
    try {
      await copyToClipboard(urls.join('\n'));
      window.alert(`${urls.length}개의 URL을 클립보드에 복사했습니다.`);
    } catch (error) {
      console.error('URL 복사 실패:', error);
      window.alert('클립보드 접근 권한을 확인해주세요.');
    }
  };

  const handleQueueDownloadUrls = () => {
    if (queueSelection.length === 0) {
      window.alert('먼저 큐에서 내보낼 항목을 선택하세요.');
      return;
    }
    const urls = queueItems
      .filter((item) => queueSelectionSet.has(item.id))
      .map((item) => buildVideoUrl(item.videoId))
      .filter(Boolean);
    if (urls.length === 0) {
      window.alert('선택한 항목에서 유효한 YouTube ID를 찾지 못했습니다.');
      return;
    }
    const filename = `factory_queue_${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}.txt`;
    downloadText(filename, urls.join('\n'));
    window.alert(`${filename} 파일로 ${urls.length}개의 URL을 내려받았습니다.`);
  };

  const handleTemplateChange = (themeId, field, value) => {
    setTemplates((prev) => {
      const nextItems = { ...prev.items, [themeId]: { ...(prev.items?.[themeId] ?? { prompt: '', variables: [], sampleInput: '' }), [field]: value } };
      return { ...prev, items: nextItems };
    });
  };

  const handleTemplateVariableChange = (themeId, index, value) => {
    setTemplates((prev) => {
      const entry = prev.items?.[themeId] ?? { prompt: '', variables: [], sampleInput: '' };
      const nextVariables = [...entry.variables];
      nextVariables[index] = value;
      return {
        ...prev,
        items: { ...prev.items, [themeId]: { ...entry, variables: nextVariables } }
      };
    });
  };
  const handleAddTemplateVariable = (themeId) => {
    setTemplates((prev) => {
      const entry = prev.items?.[themeId] ?? { prompt: '', variables: [], sampleInput: '' };
      return {
        ...prev,
        items: { ...prev.items, [themeId]: { ...entry, variables: [...entry.variables, '{{title}}'] } }
      };
    });
  };

  const handleRemoveTemplateVariable = (themeId, index) => {
    setTemplates((prev) => {
      const entry = prev.items?.[themeId] ?? { prompt: '', variables: [], sampleInput: '' };
      return {
        ...prev,
        items: {
          ...prev.items,
          [themeId]: {
            ...entry,
            variables: entry.variables.filter((_, idx) => idx !== index)
          }
        }
      };
    });
  };

  const handleSaveTemplate = async (themeId) => {
    try {
      setTemplateSaving(true);
      setTemplateError('');
      const template = templates.items?.[themeId] ?? { prompt: '', variables: [], sampleInput: '' };
      const schemaPreview = templates.schemaPreview ?? '';
      const updated = await saveFactoryTemplate(themeId, template, { schemaPreview, updatedBy });
      setTemplates(updated);
      window.alert('템플릿을 저장했습니다.');
    } catch (error) {
      console.error('템플릿 저장 실패:', error);
      setTemplateError('템플릿을 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleCopyJson = async (item) => {
    if (!item?.jsonLine) {
      window.alert('저장된 JSON 라인이 없습니다.');
      return;
    }
    try {
      await copyToClipboard(item.jsonLine);
      window.alert('1줄 JSON을 복사했습니다.');
    } catch (error) {
      window.alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.');
    }
  };

  const handleCopyThreadsSummary = async (item) => {
    const text = item?.threadsSummary || item?.summary;
    if (!text) {
      window.alert('복사할 Threads 요약이 없습니다.');
      return;
    }
    try {
      await copyToClipboard(text);
      window.alert('Threads용 요약을 복사했습니다.');
    } catch (error) {
      window.alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인하세요.');
    }
  };

  const handlePublishDraft = (item) => {
    if (!item?.jsonLine) {
      window.alert('JSON 데이터가 없어 임시글로 전환할 수 없습니다.');
      return;
    }
    try {
      window.localStorage.setItem('factory:lastJsonLine', item.jsonLine);
      navigate('/admin/new?from=factory');
    } catch (error) {
      console.error('임시글 저장 실패:', error);
      window.alert('브라우저 저장소를 사용할 수 없어 임시글로 전환하지 못했습니다.');
    }
  };

  const handleDownloadLogs = () => {
    if (!logs || logs.length === 0) {
      window.alert('다운로드할 로그가 없습니다.');
      return;
    }
    const content = logs
      .map((log) => `${formatDateTime(log.createdAt)} [${log.level}] (${log.phase}) ${log.message}`)
      .join('\n');
    downloadText('factory_logs.txt', content);
  };

  const handleSaveSchedules = async () => {
    try {
      const updated = await saveFactorySchedules(schedules, { updatedBy });
      setSchedules(updated);
      setSettingsMessage('스케줄을 저장했습니다.');
    } catch (error) {
      console.error('스케줄 저장 실패:', error);
      setSettingsError('스케줄을 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleSaveSafety = async () => {
    try {
      const updated = await saveFactorySafetyOptions(safety, { updatedBy });
      setSafety(updated);
      setSettingsMessage('안전 모드를 저장했습니다.');
    } catch (error) {
      console.error('안전모드 저장 실패:', error);
      setSettingsError('안전모드를 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleSaveBalance = async () => {
    try {
      const updated = await saveFactoryBalanceSettings(balance, { updatedBy });
      setBalance(updated);
      setSettingsMessage('정치 균형 설정을 저장했습니다.');
    } catch (error) {
      console.error('정치 균형 저장 실패:', error);
      setSettingsError('정치 균형 설정을 저장하지 못했습니다. Firestore 권한을 확인하세요.');
    }
  };

  const handleProgressiveWeightChange = (event) => {
    const next = Number(event.target.value);
    setBalance((prev) => {
      if (prev.autoBalanceEnabled) {
        const conservativeWeight = Math.max(0, 100 - next);
        return { ...prev, progressiveWeight: next, conservativeWeight };
      }
      return { ...prev, progressiveWeight: next };
    });
  };

  const handleConservativeWeightChange = (event) => {
    const next = Number(event.target.value);
    setBalance((prev) => {
      if (prev.autoBalanceEnabled) {
        const progressiveWeight = Math.max(0, 100 - next);
        return { ...prev, conservativeWeight: next, progressiveWeight };
      }
      return { ...prev, conservativeWeight: next };
    });
  };

  const dirtyCurrentTheme = dirtyThemes[selectedThemeId];

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">YouTube 스크립트 공장</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Firestore에 저장된 실시간 데이터를 기반으로 스캔·추출·변환 공정을 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['scan', 'extract', 'convert'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDashboardToggle(key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                  dashboard?.toggles?.[key]
                    ? 'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100'
                }`}
                disabled={dashboardSaving}
              >
                {key === 'scan' && '지금 스캔'}
                {key === 'extract' && '지금 추출'}
                {key === 'convert' && '지금 변환(JSON)'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              사용 가이드
            </button>
          </div>
        </div>
        {dashboardError && <p className="mt-4 text-sm text-rose-500">{dashboardError}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {summaryMetrics.map((metric) => {
            const toneClass = METRIC_TONE_STYLES[metric.tone] ?? METRIC_TONE_STYLES.default;
            return (
              <div key={metric.label} className={`rounded-lg border p-4 transition ${toneClass.container}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${toneClass.label}`}>{metric.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{metric.value}</p>
              </div>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap gap-2">
              {THEME_CONFIG.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setSelectedThemeId(theme.id);
                    const groups = ensureArray(themeConfigs[theme.id]?.groups);
                    setSelectedGroupId(groups[0]?.id ?? '');
                    setExplorerGroupFilter('');
                    setExplorerChannelFilter('');
                  }}
                  className={`rounded-full px-4 py-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    selectedThemeId === theme.id
                      ? 'bg-indigo-500 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>총 그룹 {themeGroups.length}개</span>
              <span>채널 {availableChannels.length}개</span>
              {dirtyCurrentTheme && <span className="font-semibold text-amber-600">저장 필요</span>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">테마 & 채널 그룹</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  그룹 추가
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddChannels}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  채널 일괄추가
                </button>
                <button
                  type="button"
                  onClick={handleExportChannels}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  JSON 내보내기
                </button>
                <label className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-400">
                  가져오기
                  <input type="file" accept="application/json" onChange={handleImportChannels} className="hidden" />
                </label>
              </div>
            </header>
            {themeError && <p className="mt-3 text-xs text-rose-500">{themeError}</p>}
            <div className="mt-4 space-y-3">
              {themeLoading ? (
                <p className="text-sm text-slate-500">채널 구성을 불러오는 중...</p>
              ) : themeGroups.length === 0 ? (
                <p className="text-sm text-slate-500">등록된 그룹이 없습니다. 상단 버튼으로 그룹을 추가하세요.</p>
              ) : (
                themeGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`rounded-lg border px-3 py-2 ${selectedGroupId === group.id ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.name || '이름 없는 그룹'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          직접 채널 {ensureArray(group.channels).length}개 · 하위 {ensureArray(group.children).length}개 그룹
                        </p>
                      </div>
                      <span className="text-xs text-indigo-500">{selectedGroupId === group.id ? '선택됨' : '선택'}</span>
                    </button>
                    {selectedGroupId === group.id && (
                      <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {ensureArray(group.channels).map((channel) => (
                          <div key={channel.id} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{channel.name || '채널명 미입력'}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{channel.id}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1">
                                  <span>우선순위</span>
                                  <select
                                    value={channel.priority || '중간'}
                                    onChange={(event) => handleChannelFieldChange(selectedThemeId, { groupId: group.id, channelId: channel.id }, 'priority', event.target.value)}
                                    className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                                  >
                                    <option value="높음">높음</option>
                                    <option value="중간">중간</option>
                                    <option value="낮음">낮음</option>
                                  </select>
                                </label>
                                <label className="flex items-center gap-1">
                                  <span>주기(분)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={channel.intervalMinutes ?? 0}
                                    onChange={(event) => handleChannelFieldChange(selectedThemeId, { groupId: group.id, channelId: channel.id }, 'intervalMinutes', Number(event.target.value))}
                                    className="w-20 rounded border border-slate-300 px-2 py-0.5 text-xs"
                                  />
                                </label>
                                <label className="flex items-center gap-1">
                                  <span>활성</span>
                                  <input
                                    type="checkbox"
                                    checked={channel.active !== false}
                                    onChange={() => handleToggleChannelActive(selectedThemeId, { groupId: group.id, channelId: channel.id })}
                                    className="h-3 w-3 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                                  />
                                </label>
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">최근 주기: {getChannelIntervalLabel(channel)}</p>
                          </div>
                        ))}
                        {ensureArray(group.children).length > 0 && (
                          <div className="space-y-2">
                            {ensureArray(group.children).map((child) => (
                              <div key={child.id} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{child.name || '하위 그룹'}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">채널 {ensureArray(child.channels).length}개</p>
                                <div className="mt-2 space-y-2">
                                  {ensureArray(child.channels).map((channel) => (
                                    <div key={channel.id} className="rounded border border-slate-200 p-2 dark:border-slate-700">
                                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div>
                                          <p className="font-semibold text-slate-900 dark:text-slate-100">{channel.name || '채널명 미입력'}</p>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{channel.id}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <label className="flex items-center gap-1">
                                            <span>우선순위</span>
                                            <select
                                              value={channel.priority || '중간'}
                                              onChange={(event) => handleChannelFieldChange(selectedThemeId, { groupId: group.id, childId: child.id, channelId: channel.id }, 'priority', event.target.value)}
                                              className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                                            >
                                              <option value="높음">높음</option>
                                              <option value="중간">중간</option>
                                              <option value="낮음">낮음</option>
                                            </select>
                                          </label>
                                          <label className="flex items-center gap-1">
                                            <span>주기(분)</span>
                                            <input
                                              type="number"
                                              min="0"
                                              value={channel.intervalMinutes ?? 0}
                                              onChange={(event) => handleChannelFieldChange(selectedThemeId, { groupId: group.id, childId: child.id, channelId: channel.id }, 'intervalMinutes', Number(event.target.value))}
                                              className="w-20 rounded border border-slate-300 px-2 py-0.5 text-xs"
                                            />
                                          </label>
                                          <label className="flex items-center gap-1">
                                            <span>활성</span>
                                            <input
                                              type="checkbox"
                                              checked={channel.active !== false}
                                              onChange={() => handleToggleChannelActive(selectedThemeId, { groupId: group.id, childId: child.id, channelId: channel.id })}
                                              className="h-3 w-3 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                                            />
                                          </label>
                                        </div>
                                      </div>
                                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">최근 주기: {getChannelIntervalLabel(channel)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveTheme}
              disabled={!dirtyCurrentTheme}
              className={`mt-4 w-full rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                dirtyCurrentTheme
                  ? 'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800'
              }`}
            >
              채널 구성 저장
            </button>
          </div>
        </aside>
        <div className="space-y-4">
          <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  activeTab === tab.id ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'explorer' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">탐색 (최신 영상 검색)</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">채널/그룹 선택 후 큐에 담을 영상을 선택하세요.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={explorerGroupFilter}
                    onChange={(event) => setExplorerGroupFilter(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    <option value="">전체 그룹</option>
                    {themeGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || getThemeTabLabel(selectedThemeId)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={explorerChannelFilter}
                    onChange={(event) => setExplorerChannelFilter(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    <option value="">전체 채널</option>
                    {availableChannels.map((channel) => (
                      <option key={`${channel.groupId}-${channel.id}`} value={channel.id}>
                        {channel.name || channel.id}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={explorerShowExcluded}
                      onChange={(event) => setExplorerShowExcluded(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                    />
                    제외 포함
                  </label>
                </div>
              </header>
              {explorerError && <p className="text-sm text-rose-500">{explorerError}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleQueueSelectedFromExplorer}
                  className="rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  큐에 담기
                </button>
                <button
                  type="button"
                  onClick={handleExcludeExplorerItems}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  제외
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setExplorerLoading(true);
                      const refreshed = await getFactoryExplorerItems({ limitCount: 120 });
                      setExplorerItems(refreshed);
                    } catch (error) {
                      window.alert('탐색 목록을 새로고침하지 못했습니다.');
                    } finally {
                      setExplorerLoading(false);
                    }
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  새로고침
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">선택 {explorerSelection.length}개</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">선택</th>
                      <th className="px-4 py-3">썸네일</th>
                      <th className="px-4 py-3">제목</th>
                      <th className="px-4 py-3">채널</th>
                      <th className="px-4 py-3">업로드</th>
                      <th className="px-4 py-3">길이</th>
                      <th className="px-4 py-3">언어</th>
                      <th className="px-4 py-3">자막</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {explorerLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          탐색 데이터를 불러오는 중...
                        </td>
                      </tr>
                    ) : filteredExplorerItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          표시할 탐색 결과가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredExplorerItems.map((item) => (
                        <tr key={item.id} className="bg-white text-slate-700 transition hover:bg-indigo-50/40 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={explorerSelectionSet.has(item.id)}
                              onChange={() => toggleExplorerSelection(item.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <img src={item.thumbnail || 'https://dummyimage.com/96x54/111827/fff&text=Thumb'} alt="thumbnail" className="h-14 w-24 rounded object-cover" />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.videoTitle || '제목 없음'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.groupName || getThemeTabLabel(item.themeId)}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.channelName || item.channelId || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(item.publishedAt)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.durationSeconds ? `${Math.floor(item.durationSeconds / 60)}:${String(item.durationSeconds % 60).padStart(2, '0')}` : '-'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.language || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.hasCaptions ? 'O' : 'X'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'queue' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">큐 (대기열)</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">상태별 필터 후 벌크 작업을 실행하세요.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={queueStatusFilter}
                    onChange={(event) => setQueueStatusFilter(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {QUEUE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleQueueCopyUrls}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    URL 복사
                  </button>
                  <button
                    type="button"
                    onClick={handleQueueDownloadUrls}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    TXT 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQueueAction('extract')}
                    className="rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    추출 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQueueAction('convert')}
                    className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    변환(JSON 생성)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQueueAction('retry')}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    재시도
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQueueAction('delete')}
                    className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    삭제
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">선택 {queueSelection.length}개</span>
                </div>
              </header>
              {queueError && <p className="text-sm text-rose-500">{queueError}</p>}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">선택</th>
                      <th className="px-4 py-3">테마</th>
                      <th className="px-4 py-3">그룹</th>
                      <th className="px-4 py-3">채널</th>
                      <th className="px-4 py-3">영상제목</th>
                      <th className="px-4 py-3">업로드시각</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3">우선순위</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {queueLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          큐 데이터를 불러오는 중...
                        </td>
                      </tr>
                    ) : filteredQueueItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          표시할 큐 항목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredQueueItems.map((item) => (
                        <tr key={item.id} className="bg-white text-slate-700 transition hover:bg-indigo-50/40 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={queueSelectionSet.has(item.id)}
                              onChange={() => toggleQueueSelection(item.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.themeLabel || getThemeLabel(item.themeId)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.groupName || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.channelName || item.channelId || '-'}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.videoTitle || '제목 없음'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.videoId}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(item.publishedAt)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              item.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                : item.status === 'error'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                : item.status === 'extracting'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'
                            }`}
                            >
                              {QUEUE_STATUS_LABELS[item.status] || '대기'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.priority || '중간'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'templates' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">템플릿</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">테마별 추출 프롬프트와 스키마를 관리합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={templateThemeId}
                    onChange={(event) => setTemplateThemeId(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {THEME_CONFIG.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveTemplate(templateThemeId)}
                    className="rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    disabled={templateSaving}
                  >
                    템플릿 저장
                  </button>
                </div>
              </header>
              {templateError && <p className="text-sm text-rose-500">{templateError}</p>}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {getThemeTabLabel(templateThemeId)} 프롬프트
                  </label>
                  <textarea
                    rows={12}
                    value={templates.items?.[templateThemeId]?.prompt || ''}
                    onChange={(event) => handleTemplateChange(templateThemeId, 'prompt', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="{{title}}, {{publishedAt}}, {{channelName}}와 같은 변수를 활용하세요."
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">사용 변수</p>
                      <button
                        type="button"
                        onClick={() => handleAddTemplateVariable(templateThemeId)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        변수 추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ensureArray(templates.items?.[templateThemeId]?.variables).map((variable, index) => (
                        <div key={`${templateThemeId}-var-${index}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={variable}
                            onChange={(event) => handleTemplateVariableChange(templateThemeId, index, event.target.value)}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplateVariable(templateThemeId, index)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-600"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      {ensureArray(templates.items?.[templateThemeId]?.variables).length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">등록된 변수가 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">출력 스키마 (1줄 JSON)</label>
                  <textarea
                    rows={12}
                    value={templates.schemaPreview || ''}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, schemaPreview: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder='{"id":"...","title":"..."}'
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">샘플 스크립트로 테스트</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      실제 파이프라인과 연동되면 이 영역에서 추출된 JSON을 미리 검증할 수 있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.alert('샘플 테스트는 추후 백엔드 연동 시 제공됩니다.')}
                      className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      샘플 스크립트로 테스트
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'results' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">결과</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">성공/실패 상태와 날짜 범위로 필터링합니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={resultStatusFilter}
                    onChange={(event) => setResultStatusFilter(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {RESULT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={resultDateFrom}
                    onChange={(event) => setResultDateFrom(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={resultDateTo}
                    onChange={(event) => setResultDateTo(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setResultsLoading(true);
                        const refreshed = await getFactoryResults({ limitCount: 120 });
                        setResults(refreshed);
                      } catch (error) {
                        window.alert('결과 목록을 새로고침하지 못했습니다.');
                      } finally {
                        setResultsLoading(false);
                      }
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    새로고침
                  </button>
                </div>
              </header>
              {resultsError && <p className="text-sm text-rose-500">{resultsError}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {resultsLoading ? (
                  <p className="col-span-2 text-center text-slate-500">결과 데이터를 불러오는 중...</p>
                ) : filteredResults.length === 0 ? (
                  <p className="col-span-2 text-center text-slate-500">표시할 결과가 없습니다.</p>
                ) : (
                  filteredResults.map((item) => (
                    <article key={item.id} className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-indigo-500">{getThemeTabLabel(item.themeId)}</p>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.title || '제목 없음'}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.channelName || item.channelId || '-'}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : item.status === 'failure'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'
                        }`}
                        >
                          {RESULT_STATUS_LABELS[item.status] || '성공'}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{item.summary || '요약이 없습니다.'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>토큰 {formatNumber(item.tokens)}</span>
                        <span>완료 {formatDateTime(item.completedAt)}</span>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyJson(item)}
                          className="rounded-md border border-indigo-500 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300"
                        >
                          1줄 JSON 복사
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePublishDraft(item)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          임시글로 발행
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyThreadsSummary(item)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Threads용 요약 복사
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedResult(item)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          원문 스크립트 보기
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'logs' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">로그</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">스캔/추출/변환 로그 최신 200건을 표시합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLogsLoading(true);
                        const refreshed = await getFactoryLogs({ limitCount: 200 });
                        setLogs(refreshed);
                      } catch (error) {
                        window.alert('로그를 새로고침하지 못했습니다.');
                      } finally {
                        setLogsLoading(false);
                      }
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    새로고침
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadLogs}
                    className="rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    다운로드
                  </button>
                </div>
              </header>
              {logsError && <p className="text-sm text-rose-500">{logsError}</p>}
              <div className="h-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {logsLoading ? (
                  <p>로그를 불러오는 중...</p>
                ) : logs.length === 0 ? (
                  <p>표시할 로그가 없습니다.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border-b border-slate-200 pb-3 pt-2 last:border-b-0 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(log.createdAt)} · {log.phase || '공정'}</p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">[{log.level?.toUpperCase()}] {log.message}</p>
                      {log.context && <p className="text-xs text-slate-500 dark:text-slate-400">{log.context}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">스케줄 (크론)</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">스캔/추출/변환 주기를 분 단위 Cron 표현식으로 관리합니다.</p>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">스캔 주기</span>
                <input
                  type="text"
                  value={schedules.scanCron || ''}
                  onChange={(event) => setSchedules((prev) => ({ ...prev, scanCron: event.target.value }))}
                  className="rounded border border-slate-300 px-3 py-1.5"
                  placeholder="0 */6 * * *"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">추출 주기</span>
                <input
                  type="text"
                  value={schedules.extractCron || ''}
                  onChange={(event) => setSchedules((prev) => ({ ...prev, extractCron: event.target.value }))}
                  className="rounded border border-slate-300 px-3 py-1.5"
                  placeholder="15 */6 * * *"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">변환 주기</span>
                <input
                  type="text"
                  value={schedules.convertCron || ''}
                  onChange={(event) => setSchedules((prev) => ({ ...prev, convertCron: event.target.value }))}
                  className="rounded border border-slate-300 px-3 py-1.5"
                  placeholder="30 */6 * * *"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveSchedules}
                className="w-full rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                disabled={settingsLoading}
              >
                스케줄 저장
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">안전 모드</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">자동 발행 제한과 채널당 일일 최대 추출 수를 설정합니다.</p>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">검수 전 발행 금지</span>
                <input
                  type="checkbox"
                  checked={safety.requireReviewBeforePublish !== false}
                  onChange={(event) => setSafety((prev) => ({ ...prev, requireReviewBeforePublish: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">채널당 일일 최대 n건</span>
                <input
                  type="number"
                  min="0"
                  value={safety.dailyMaxPerChannel ?? 0}
                  onChange={(event) => setSafety((prev) => ({ ...prev, dailyMaxPerChannel: Number(event.target.value) }))}
                  className="rounded border border-slate-300 px-3 py-1.5"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveSafety}
                className="w-full rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                disabled={settingsLoading}
              >
                안전 모드 저장
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">정치 균형 (사건/정책)</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">진보/보수 노출 비율을 조정하고 자동 균형 기능을 제어합니다.</p>
            <div className="mt-3 space-y-4 text-sm">
              <label className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">자동 균형</span>
                <input
                  type="checkbox"
                  checked={balance.autoBalanceEnabled !== false}
                  onChange={(event) => setBalance((prev) => ({ ...prev, autoBalanceEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                />
              </label>
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">진보 노출 비율 (%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={balance.progressiveWeight ?? 50}
                    onChange={handleProgressiveWeightChange}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{balance.progressiveWeight ?? 50}%</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">보수 노출 비율 (%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={balance.conservativeWeight ?? 50}
                    onChange={handleConservativeWeightChange}
                    disabled={balance.autoBalanceEnabled}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{balance.conservativeWeight ?? 50}%</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveBalance}
                className="w-full rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                disabled={settingsLoading}
              >
                정치 균형 저장
              </button>
            </div>
          </div>

          {(settingsError || settingsMessage) && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {settingsError && <p className="text-rose-500">{settingsError}</p>}
              {settingsMessage && <p className="text-emerald-600 dark:text-emerald-300">{settingsMessage}</p>}
            </div>
          )}
        </aside>
      </div>

      <ResultTranscriptModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      <FactoryHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </section>
  );
}

export default AdminFactoryPage;
