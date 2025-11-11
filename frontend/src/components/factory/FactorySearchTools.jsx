// frontend/src/components/factory/FactorySearchTools.jsx
// FastAPI 기반 YouTube 검색 도구. 리뉴얼 요구에 따라 키워드 검색과 결과 열람/채널 추출에 집중한다.

import { useMemo, useState } from 'react';
import { searchFactoryVideos } from '../../utils/factoryApi.js';
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

const toChannelSet = (value) => {
  if (!value) return new Set();
  if (value instanceof Set) {
    return new Set(value);
  }
  if (Array.isArray(value)) {
    return new Set(value);
  }
  return new Set();
};

export default function FactorySearchTools({
  onChannelPick,
  existingChannelIds = [],
  targetLabel = '',
  className = ''
}) {
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
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const isCustomRange = timeFilter === 'custom';
  const existingChannelSet = useMemo(() => toChannelSet(existingChannelIds), [existingChannelIds]);

  const totalResultCount = useMemo(
    () =>
      searchResults.reduce((acc, group) => {
        return acc + ensureArray(group.items).length;
      }, 0),
    [searchResults]
  );

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
        channel_ids: channelIdsInput
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean)
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
      setFeedbackMessage(
        `검색 완료: 총 ${groups.reduce((acc, group) => acc + ensureArray(group.items).length, 0)}개 영상`
      );
    } catch (error) {
      setSearchError(error.message || '검색에 실패했습니다. 네트워크를 확인하세요.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddChannelFromResult = async (item, keyword) => {
    if (!item?.channel_id) {
      setFeedbackMessage('채널 ID가 없는 항목입니다.');
      return;
    }
    const trimmedId = item.channel_id.trim();
    if (!trimmedId) {
      setFeedbackMessage('채널 ID가 비어 있습니다.');
      return;
    }
    if (existingChannelSet.has(trimmedId)) {
      setFeedbackMessage('이미 선택된 위치에 존재하는 채널입니다.');
      return;
    }
    if (typeof onChannelPick !== 'function') {
      setFeedbackMessage('채널 저장 콜백이 연결되어 있지 않습니다.');
      return;
    }
    try {
      const response = await Promise.resolve(
        onChannelPick({
          id: trimmedId,
          name: item.channel_title || '',
          keyword,
          videoTitle: item.title || '',
          url: extractVideoUrl(item)
        })
      );
      if (response && response.message) {
        setFeedbackMessage(response.message);
      } else {
        setFeedbackMessage('채널을 저장 위치에 추가했습니다.');
      }
    } catch (error) {
      setFeedbackMessage(error.message || '채널을 추가하지 못했습니다. 저장 위치를 확인하세요.');
    }
  };

  return (
    <section
      className={`space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">YouTube 키워드 검색</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          키워드를 입력하고 조건을 조정한 뒤 검색하면 채널명/채널 ID를 한 번에 확인할 수 있습니다. 행의 "추가" 버튼을
          사용하면 선택한 테마 위치에 채널을 곧바로 저장할 수 있습니다.
        </p>
        {!IS_FACTORY_API_CONFIGURED && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
            Factory API 서버 기본 URL이 설정되지 않았습니다. VITE_FACTORY_API_BASE_URL 환경 변수를 확인하세요.
          </p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          현재 선택된 저장 위치: {targetLabel ? <span className="font-semibold text-indigo-600 dark:text-indigo-300">{targetLabel}</span> : '미선택'}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">검색 키워드</label>
          <textarea
            value={keywordsText}
            onChange={(event) => setKeywordsText(event.target.value)}
            rows={6}
            placeholder="한 줄에 하나씩 키워드를 입력하세요."
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">채널 ID 필터 (선택)</label>
          <textarea
            value={channelIdsInput}
            onChange={(event) => setChannelIdsInput(event.target.value)}
            rows={6}
            placeholder="UC로 시작하는 채널 ID를 공백 또는 줄바꿈으로 구분해 입력"
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">최대 결과 수</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">정렬 기준</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">조회수 최소값</span>
          <input
            type="number"
            min={0}
            value={minViews}
            onChange={(event) => setMinViews(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">영상 길이 필터</span>
          <select
            value={durationFilter}
            onChange={(event) => setDurationFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {DURATION_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">기간 필터</span>
          <select
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {TIME_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {isCustomRange && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">시작일시</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">종료일시</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
        )}
      </section>

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          총 {totalResultCount.toLocaleString('ko-KR')}개 결과
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-md border border-indigo-500 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={searchLoading}
        >
          {searchLoading ? '검색 중...' : '검색 실행'}
        </button>
      </div>

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">검색 결과</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">채널 정보를 확인하고 원하는 채널을 즉시 추가하세요.</p>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <th className="px-3 py-2">업로드일</th>
                      <th className="px-3 py-2">채널명</th>
                      <th className="px-3 py-2">채널 ID</th>
                      <th className="px-3 py-2">조회수</th>
                      <th className="px-3 py-2">길이</th>
                      <th className="px-3 py-2">제목</th>
                      <th className="px-3 py-2">URL</th>
                      <th className="px-3 py-2">추가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {ensureArray(group.items).map((item) => {
                      const url = extractVideoUrl(item);
                      const channelId = item.channel_id || '';
                      const alreadyAdded = existingChannelSet.has(channelId.trim());
                      return (
                        <tr
                          key={`${group.keyword}-${channelId}-${item.video_id || url}`}
                          className="bg-white text-slate-700 transition hover:bg-indigo-50/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
                        >
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.date_fmt || '-'}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.channel_title || '-'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{channelId || '-'}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{formatNumber(item.view_count)}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.dur_hms || '-'}</td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.has_captions ? '자막 O' : '자막 X'} · {item.language || '언어 정보 없음'}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-indigo-600 dark:text-indigo-300">
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="underline">
                                열기
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleAddChannelFromResult(item, group.keyword)}
                              disabled={alreadyAdded}
                              className="rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              {alreadyAdded ? '추가됨' : '추가'}
                            </button>
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
    </section>
  );
}
