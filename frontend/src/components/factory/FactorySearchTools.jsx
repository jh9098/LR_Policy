// frontend/src/components/factory/FactorySearchTools.jsx
// FastAPI 기반 YouTube 검색 & 자막 추출 도구.

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  addChannelsToFactoryStore,
  extractFactoryCaptions,
  getFactoryChannelStore,
  removeChannelsFromFactoryStore,
  searchFactoryVideos
} from '../../utils/factoryApi.js';
import { IS_FACTORY_API_CONFIGURED } from '../../config.js';

const SORT_OPTIONS = [
  { value: 'views', label: '조회수순 (views)' },
  { value: 'date', label: '최신순 (date)' }
];

const TIME_FILTER_OPTIONS = [
  { value: 'any', label: '전체 기간' },
  { value: 'day', label: '최근 24시간' },
  { value: 'week', label: '최근 1주' },
  { value: 'month', label: '최근 1개월' },
  { value: 'custom', label: '직접 지정' }
];

const DURATION_FILTER_OPTIONS = [
  { value: 'any', label: '전체 길이' },
  { value: 'short', label: '짧음 (<4분)' },
  { value: 'medium', label: '중간 (4~20분)' },
  { value: 'long', label: '김 (>20분)' }
];

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('ko-KR');
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const extractVideoUrl = (item) => {
  if (typeof item?.url === 'string') {
    return item.url;
  }
  if (item?.video_id) {
    return `https://www.youtube.com/watch?v=${item.video_id}`;
  }
  return '';
};

const toIsoString = (value) => {
  if (!value) return '';
  try {
    const instance = new Date(value);
    if (Number.isNaN(instance.getTime())) return '';
    return instance.toISOString();
  } catch (error) {
    return '';
  }
};

const downloadTextFile = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            닫기
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export default function FactorySearchTools() {
  const [keywordsText, setKeywordsText] = useState('');
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('date');
  const [timeFilter, setTimeFilter] = useState('any');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [durationFilter, setDurationFilter] = useState('any');
  const [minViews, setMinViews] = useState('0');
  const [lenMin, setLenMin] = useState('');
  const [lenMax, setLenMax] = useState('');
  const [channelIdsInput, setChannelIdsInput] = useState('');

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [selectedUrls, setSelectedUrls] = useState(() => new Set());
  const [urlsInput, setUrlsInput] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractResults, setExtractResults] = useState([]);

  const [channelStoreLoading, setChannelStoreLoading] = useState(false);
  const [channelStore, setChannelStore] = useState([]);
  const [storeError, setStoreError] = useState('');

  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilter, setSaveFilter] = useState('');
  const [saveSelection, setSaveSelection] = useState(() => new Set());

  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadFilter, setLoadFilter] = useState('');
  const [loadSelection, setLoadSelection] = useState(() => new Set());

  const isCustomRange = timeFilter === 'custom';

  useEffect(() => {
    const refresh = async () => {
      try {
        setChannelStoreLoading(true);
        const data = await getFactoryChannelStore();
        setChannelStore(ensureArray(data?.channels));
        setStoreError('');
      } catch (error) {
        setStoreError(error.message || '채널 저장소를 불러오지 못했습니다.');
      } finally {
        setChannelStoreLoading(false);
      }
    };
    if (IS_FACTORY_API_CONFIGURED) {
      refresh();
    }
  }, []);

  const uniqueChannelsFromResults = useMemo(() => {
    const map = new Map();
    searchResults.forEach((group) => {
      ensureArray(group.items).forEach((item) => {
        const channelId = item.channel_id;
        if (typeof channelId === 'string' && channelId.startsWith('UC')) {
          if (!map.has(channelId)) {
            map.set(channelId, { id: channelId, title: item.channel_title || '' });
          }
        }
      });
    });
    return Array.from(map.values());
  }, [searchResults]);

  const allVideoItems = useMemo(
    () =>
      searchResults.flatMap((group) =>
        ensureArray(group.items).map((item) => ({ ...item, keyword: group.keyword }))
      ),
    [searchResults]
  );

  useEffect(() => {
    if (!showSaveModal) {
      setSaveSelection(new Set());
      setSaveFilter('');
    }
  }, [showSaveModal]);

  useEffect(() => {
    if (!showLoadModal) {
      setLoadSelection(new Set());
      setLoadFilter('');
    }
  }, [showLoadModal]);

  const filteredSaveChannels = useMemo(() => {
    const keyword = saveFilter.trim().toLowerCase();
    if (!keyword) return uniqueChannelsFromResults;
    return uniqueChannelsFromResults.filter((channel) =>
      (channel.title || '').toLowerCase().includes(keyword)
    );
  }, [uniqueChannelsFromResults, saveFilter]);

  const filteredLoadChannels = useMemo(() => {
    const keyword = loadFilter.trim().toLowerCase();
    if (!keyword) return channelStore;
    return ensureArray(channelStore).filter((channel) =>
      (channel.title || '').toLowerCase().includes(keyword)
    );
  }, [channelStore, loadFilter]);

  const refreshChannelStore = async () => {
    try {
      setChannelStoreLoading(true);
      const data = await getFactoryChannelStore();
      setChannelStore(ensureArray(data?.channels));
      setStoreError('');
    } catch (error) {
      setStoreError(error.message || '채널 저장소를 불러오지 못했습니다.');
    } finally {
      setChannelStoreLoading(false);
    }
  };

  const toggleUrlSelection = (url) => {
    if (!url) return;
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      setUrlsInput(Array.from(next).join('\n'));
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set(allVideoItems.map((item) => extractVideoUrl(item)).filter(Boolean));
    setSelectedUrls(next);
    setUrlsInput(Array.from(next).join('\n'));
  };

  const handleClearSelection = () => {
    setSelectedUrls(new Set());
    setUrlsInput('');
  };

  const parseChannelIds = () =>
    channelIdsInput
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

  const handleSearch = async () => {
    try {
      setFeedbackMessage('');
      setSearchError('');
      const keywords = keywordsText
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);
      if (keywords.length === 0) {
        setSearchError('키워드를 한 줄에 하나씩 입력하세요.');
        return;
      }
      if (!IS_FACTORY_API_CONFIGURED) {
        setSearchError('Factory API 서버 기본 URL이 설정되지 않았습니다. VITE_FACTORY_API_BASE_URL 환경 변수를 확인하세요.');
        return;
      }

      const limitValue = Number.isFinite(Number(limit)) ? Number(limit) : 50;
      const lenMinValue = lenMin ? Number(lenMin) : null;
      const lenMaxValue = lenMax ? Number(lenMax) : null;
      if (Number.isFinite(lenMinValue) && Number.isFinite(lenMaxValue) && lenMinValue > lenMaxValue) {
        setSearchError('길이(초) 최소값이 최대값보다 클 수 없습니다.');
        return;
      }

      const payload = {
        keywords,
        limit: Math.max(1, Math.min(limitValue || 1, 50)),
        sort_by: sortBy,
        time_filter: timeFilter,
        custom_from_iso: isCustomRange ? toIsoString(customFrom) : '',
        custom_to_iso: isCustomRange ? toIsoString(customTo) : '',
        duration_filter: durationFilter,
        min_views: Number(minViews) || 0,
        len_min: Number.isFinite(lenMinValue) ? lenMinValue : null,
        len_max: Number.isFinite(lenMaxValue) ? lenMaxValue : null,
        channel_ids: parseChannelIds()
      };

      setSearchLoading(true);
      const result = await searchFactoryVideos(payload);
      const groups = [];
      keywords.forEach((keyword) => {
        groups.push({ keyword, items: ensureArray(result?.[keyword]) });
      });
      Object.entries(result || {}).forEach(([keyword, items]) => {
        if (!keywords.includes(keyword)) {
          groups.push({ keyword, items: ensureArray(items) });
        }
      });
      setSearchResults(groups);
      setSelectedUrls(new Set());
      setUrlsInput('');
      setExtractResults([]);
      setFeedbackMessage(`검색 완료: 총 ${groups.reduce((acc, group) => acc + group.items.length, 0)}개 영상`);
    } catch (error) {
      setSearchError(error.message || '검색에 실패했습니다. 네트워크를 확인하세요.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExtract = async () => {
    const urls = urlsInput
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setExtractError('자막을 추출할 YouTube URL을 입력하세요.');
      return;
    }
    try {
      setExtractError('');
      setFeedbackMessage('');
      setExtractLoading(true);
      const result = await extractFactoryCaptions({ urls });
      setExtractResults(result);
      setFeedbackMessage('자막 추출이 완료되었습니다.');
    } catch (error) {
      setExtractError(error.message || '자막 추출에 실패했습니다.');
    } finally {
      setExtractLoading(false);
    }
  };

  const handleSaveChannels = async () => {
    if (saveSelection.size === 0) {
      window.alert('저장할 채널을 선택하세요.');
      return;
    }
    try {
      setStoreError('');
      await addChannelsToFactoryStore(
        Array.from(saveSelection).map((id) => {
          const channel = uniqueChannelsFromResults.find((entry) => entry.id === id);
          return { id, title: channel?.title || '' };
        })
      );
      await refreshChannelStore();
      setFeedbackMessage(`${saveSelection.size}개 채널을 저장소에 추가했습니다.`);
      setShowSaveModal(false);
    } catch (error) {
      setStoreError(error.message || '채널 저장에 실패했습니다.');
    }
  };

  const handleLoadChannels = () => {
    if (loadSelection.size === 0) {
      window.alert('불러올 채널을 선택하세요.');
      return;
    }
    const selectedChannels = ensureArray(channelStore).filter((channel) => loadSelection.has(channel.id));
    const ids = selectedChannels.map((channel) => channel.id);
    const names = selectedChannels.map((channel) => channel.title || channel.id);
    setChannelIdsInput(ids.join(', '));
    setKeywordsText(names.join('\n'));
    setFeedbackMessage(`${ids.length}개 채널을 검색 조건에 반영했습니다.`);
    setShowLoadModal(false);
  };

  const handleDeleteChannels = async () => {
    if (loadSelection.size === 0) {
      window.alert('삭제할 채널을 선택하세요.');
      return;
    }
    if (!window.confirm(`${loadSelection.size}개 채널을 저장소에서 삭제할까요?`)) {
      return;
    }
    try {
      await removeChannelsFromFactoryStore(Array.from(loadSelection));
      await refreshChannelStore();
      setFeedbackMessage('선택한 채널을 저장소에서 삭제했습니다.');
      setShowLoadModal(false);
    } catch (error) {
      setStoreError(error.message || '채널 삭제에 실패했습니다.');
    }
  };

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">YouTube 키워드 검색 & 자막 추출</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          검색 → 채널 저장 → 채널 ID 불러오기 → 자막 추출까지 한 번에 처리할 수 있는 실전용 도구입니다.
        </p>
        {!IS_FACTORY_API_CONFIGURED && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/80 dark:bg-amber-500/10 dark:text-amber-200">
            Render에 배포한 FastAPI 서버 URL을 VITE_FACTORY_API_BASE_URL 환경 변수로 설정해야 검색/자막 기능이 동작합니다.
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            키워드 (줄바꿈으로 여러 개)
            <textarea
              value={keywordsText}
              onChange={(event) => setKeywordsText(event.target.value)}
              placeholder={'예)\nFOMC\n빛의혁명'}
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              최대 결과 (1~50)
              <input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              정렬 기준
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              기간 필터
              <select
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {TIME_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              영상 길이 (API)
              <select
                value={durationFilter}
                onChange={(event) => setDurationFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {DURATION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {isCustomRange && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                시작 시각 (UTC 변환)
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                종료 시각 (UTC 변환)
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            채널 ID (UC..., 쉼표 또는 줄바꿈 구분)
            <textarea
              value={channelIdsInput}
              onChange={(event) => setChannelIdsInput(event.target.value)}
              placeholder="UCxxxx, UCyyyy"
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              최소 조회수
              <input
                type="number"
                min={0}
                value={minViews}
                onChange={(event) => setMinViews(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              길이(초) 최소
              <input
                type="number"
                min={0}
                value={lenMin}
                onChange={(event) => setLenMin(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              길이(초) 최대
              <input
                type="number"
                min={0}
                value={lenMax}
                onChange={(event) => setLenMax(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-md border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
              disabled={searchLoading}
            >
              {searchLoading ? '검색 중...' : '검색 실행'}
            </button>
            <button
              type="button"
              onClick={() => setShowLoadModal(true)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              채널 ID 불러오기
            </button>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="rounded-md border border-emerald-400 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:border-emerald-500/60 dark:text-emerald-200"
              disabled={uniqueChannelsFromResults.length === 0}
            >
              결과 채널 저장
            </button>
          </div>
          {storeError && <p className="text-sm text-rose-500">{storeError}</p>}
          {channelStoreLoading && <p className="text-sm text-slate-500">채널 저장소를 불러오는 중...</p>}
        </div>
      </div>
      {searchError && (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/80 dark:bg-rose-500/10 dark:text-rose-200">
          {searchError}
        </p>
      )}
      {feedbackMessage && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/80 dark:bg-emerald-500/10 dark:text-emerald-200">
          {feedbackMessage}
        </p>
      )}

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">검색 결과</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              체크된 영상은 아래 자막 추출 URL 입력 칸에 자동으로 반영됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              선택 해제
            </button>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              선택 {selectedUrls.size}개
            </span>
          </div>
        </header>

        {searchLoading ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            YouTube API에서 데이터를 불러오는 중입니다...
          </p>
        ) : searchResults.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            아직 검색 결과가 없습니다.
          </p>
        ) : (
          searchResults.map((group) => (
            <div key={`result-${group.keyword || 'blank'}`} className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  키워드 — {group.keyword || '(빈 문자열)'}
                </h4>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {ensureArray(group.items).length}개
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2">선택</th>
                      <th className="px-3 py-2">업로드일</th>
                      <th className="px-3 py-2">채널</th>
                      <th className="px-3 py-2">조회수</th>
                      <th className="px-3 py-2">길이</th>
                      <th className="px-3 py-2">제목</th>
                      <th className="px-3 py-2">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {ensureArray(group.items).map((item) => {
                      const url = extractVideoUrl(item);
                      return (
                        <tr key={`${group.keyword}-${url}`} className="bg-white text-slate-700 transition hover:bg-indigo-50/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedUrls.has(url)}
                              onChange={() => toggleUrlSelection(url)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.date_fmt || '-'}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            <div className="flex flex-col">
                              <span>{item.channel_title || '-'}</span>
                              <span className="text-[11px] text-slate-400">{item.channel_id}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{formatNumber(item.view_count)}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.dur_hms || '-'}</td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.has_captions ? '자막 O' : '자막 X'} · {item.language || '언어 정보 없음'}</p>
                          </td>
                          <td className="px-3 py-2 text-indigo-600 dark:text-indigo-300">
                            <a href={url} target="_blank" rel="noreferrer" className="underline">
                              열기
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">자막 추출 URL 입력</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">체크된 영상은 아래 입력창에 자동 반영되며, 직접 추가/수정도 가능합니다.</p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{selectedUrls.size}개 선택됨</span>
        </header>
        {extractError && <p className="text-sm text-rose-500">{extractError}</p>}
        <textarea
          value={urlsInput}
          onChange={(event) => setUrlsInput(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          rows={6}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExtract}
            className="rounded-md border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
            disabled={extractLoading}
          >
            {extractLoading ? '자막 추출 중...' : '자막 추출 실행'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <header>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">자막 추출 결과</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">성공 시 .txt 버튼으로 바로 다운로드할 수 있습니다.</p>
        </header>
        {extractResults.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            아직 추출 결과가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2">제목</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">다운로드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {extractResults.map((item) => (
                  <tr key={item.url} className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{item.title || '제목 미상'}</td>
                    <td className="px-3 py-2 text-indigo-600 dark:text-indigo-300">
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline">
                        이동
                      </a>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.text ? '성공' : item.warning || '자막 없음'}</td>
                    <td className="px-3 py-2">
                      {item.text ? (
                        <button
                          type="button"
                          onClick={() => downloadTextFile(item.filename || 'video.txt', item.text)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          .txt
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showSaveModal && (
        <Modal
          title="검색 결과 채널 저장"
          onClose={() => setShowSaveModal(false)}
          footer={(
            <Fragment>
              <button
                type="button"
                onClick={handleSaveChannels}
                className="rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                선택 저장
              </button>
            </Fragment>
          )}
        >
          <div className="space-y-3">
            <input
              value={saveFilter}
              onChange={(event) => setSaveFilter(event.target.value)}
              placeholder="채널명 검색"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              {filteredSaveChannels.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-300">저장 가능한 채널이 없습니다.</p>
              ) : (
                filteredSaveChannels.map((channel) => (
                  <label
                    key={channel.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={saveSelection.has(channel.id)}
                      onChange={(event) => {
                        setSaveSelection((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) {
                            next.add(channel.id);
                          } else {
                            next.delete(channel.id);
                          }
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                    />
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{channel.title || '(채널명 없음)'}</span>
                    <span className="text-xs text-slate-400">{channel.id}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {showLoadModal && (
        <Modal
          title="채널 저장소 불러오기"
          onClose={() => setShowLoadModal(false)}
          footer={(
            <Fragment>
              <button
                type="button"
                onClick={handleDeleteChannels}
                className="rounded-md border border-rose-400 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:border-rose-500/60 dark:text-rose-200"
              >
                선택 삭제
              </button>
              <button
                type="button"
                onClick={handleLoadChannels}
                className="rounded-md border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                선택 반영
              </button>
            </Fragment>
          )}
        >
          <div className="space-y-3">
            <input
              value={loadFilter}
              onChange={(event) => setLoadFilter(event.target.value)}
              placeholder="채널명 검색"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              {filteredLoadChannels.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-300">저장된 채널이 없습니다.</p>
              ) : (
                filteredLoadChannels.map((channel) => (
                  <label
                    key={channel.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={loadSelection.has(channel.id)}
                      onChange={(event) => {
                        setLoadSelection((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) {
                            next.add(channel.id);
                          } else {
                            next.delete(channel.id);
                          }
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                    />
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{channel.title || '(채널명 없음)'}</span>
                    <span className="text-xs text-slate-400">{channel.id}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
