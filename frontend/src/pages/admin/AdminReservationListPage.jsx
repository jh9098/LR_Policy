import { useEffect, useMemo, useState } from 'react';
import { getThemeLabel, THEME_CONFIG } from '../../constants/themeConfig.js';
import {
  deleteIssue,
  getReservationSettings,
  getScheduledIssues,
  saveReservationSettings,
  updateIssue
} from '../../firebaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  formatDateTimeInputValue,
  formatKoreanDateTime,
  parseDateTimeInput
} from '../../utils/dateFormat.js';

function ThemeIntervalRow({
  theme,
  value,
  nextVisibleAt,
  onChange,
  onSave,
  isSaving
}) {
  const label = getThemeLabel(theme.id);
  const nextText = nextVisibleAt instanceof Date ? formatKoreanDateTime(nextVisibleAt) : '미정';

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:grid-cols-[1.5fr_1fr_auto]">
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">테마별 예약 간격을 분 단위로 입력하세요. 0으로 설정하면 연속 게시가 가능합니다.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">다음 예정 시간: {nextText}</p>
      </div>
      <input
        type="number"
        min="0"
        step="5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`h-11 rounded-lg px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          isSaving
            ? 'cursor-not-allowed bg-indigo-200 text-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300/50'
            : 'bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600'
        }`}
      >
        {isSaving ? '저장 중...' : '간격 저장'}
      </button>
    </div>
  );
}

function ReservationCard({
  item,
  scheduleValue,
  onScheduleChange,
  onApplySchedule,
  onPublishNow,
  onDelete,
  isBusy
}) {
  const themeLabel = getThemeLabel(item.theme);
  const visibleText = item.visibleAfter instanceof Date ? formatKoreanDateTime(item.visibleAfter) : '시간 미지정';

  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/70">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{themeLabel}</p>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.title || '제목 없음'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">예정 시각: {visibleText}</p>
      </header>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="datetime-local"
          value={scheduleValue}
          onChange={(event) => onScheduleChange(event.target.value)}
          className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApplySchedule}
            disabled={isBusy}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isBusy
                ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600'
            }`}
          >
            시간 변경
          </button>
          <button
            type="button"
            onClick={onPublishNow}
            disabled={isBusy}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isBusy
                ? 'cursor-not-allowed bg-emerald-200 text-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300/50'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600'
            }`}
          >
            즉시 공개
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              isBusy
                ? 'cursor-not-allowed bg-rose-200 text-rose-100 dark:bg-rose-900/40 dark:text-rose-300/60'
                : 'bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-600'
            }`}
          >
            삭제
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminReservationListPage() {
  const [settings, setSettings] = useState(null);
  const [intervalInputs, setIntervalInputs] = useState({});
  const [scheduledItems, setScheduledItems] = useState([]);
  const [scheduleInputs, setScheduleInputs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingThemeId, setSavingThemeId] = useState('');
  const [busyItemId, setBusyItemId] = useState('');
  const [feedback, setFeedback] = useState('');
  const { user, adminRole } = useAuth();
  const availableThemes = useMemo(
    () => (adminRole === 'groupp' ? THEME_CONFIG.filter((theme) => theme.id === 'groupbuy') : THEME_CONFIG),
    [adminRole]
  );

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const [reservationSettings, reservations] = await Promise.all([
          getReservationSettings(),
          getScheduledIssues({ includeReleased: false })
        ]);
        if (!isMounted) return;
        setSettings(reservationSettings);
        const intervalMap = {};
        Object.entries(reservationSettings.intervals).forEach(([themeId, config]) => {
          intervalMap[themeId] = String(config.intervalMinutes ?? 0);
        });
        setIntervalInputs(intervalMap);
        const filteredReservations = reservations.filter((item) =>
          availableThemes.some((theme) => theme.id === item.theme)
        );
        setScheduledItems(filteredReservations);
        const scheduleMap = {};
        filteredReservations.forEach((item) => {
          scheduleMap[item.id] = formatDateTimeInputValue(item.visibleAfter instanceof Date ? item.visibleAfter : new Date());
        });
        setScheduleInputs(scheduleMap);
      } catch (err) {
        console.error('예약 데이터 불러오기 실패:', err);
        if (!isMounted) return;
        setError('예약 설정 또는 목록을 불러오는 중 문제가 발생했습니다. 네트워크 상태와 Firestore 권한을 확인하세요.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [availableThemes]);

  const handleIntervalInputChange = (themeId, value) => {
    setIntervalInputs((prev) => ({ ...prev, [themeId]: value }));
  };

  const handleSaveInterval = async (themeId) => {
    if (!settings) return;
    const rawValue = intervalInputs[themeId];
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      window.alert('간격은 0 이상 숫자로 입력해주세요.');
      return;
    }
    setSavingThemeId(themeId);
    setFeedback('');
    try {
      const nextSettings = {
        ...settings,
        intervals: {
          ...settings.intervals,
          [themeId]: {
            ...settings.intervals[themeId],
            intervalMinutes: parsed
          }
        }
      };
      const saved = await saveReservationSettings(nextSettings, { updatedBy: user?.email ?? '' });
      setSettings(saved);
      setFeedback(`${getThemeLabel(themeId)} 예약 간격이 저장되었습니다.`);
    } catch (err) {
      console.error('예약 간격 저장 실패:', err);
      setError(err?.message || '예약 간격을 저장하는 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setSavingThemeId('');
    }
  };

  const handleScheduleInputChange = (itemId, value) => {
    setScheduleInputs((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleApplySchedule = async (item) => {
    const inputValue = scheduleInputs[item.id];
    const parsedDate = parseDateTimeInput(inputValue);
    if (!parsedDate) {
      window.alert('유효한 날짜/시간을 선택해주세요.');
      return;
    }
    setBusyItemId(item.id);
    setFeedback('');
    try {
      await updateIssue(
        item.id,
        { date: formatKoreanDateTime(parsedDate) },
        { visibilityMode: 'scheduled', visibleAfter: parsedDate }
      );
      setScheduledItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, visibleAfter: parsedDate, date: formatKoreanDateTime(parsedDate) } : entry))
      );
      setScheduleInputs((prev) => ({ ...prev, [item.id]: formatDateTimeInputValue(parsedDate) }));
      setFeedback('예약 시간이 변경되었습니다.');
    } catch (err) {
      console.error('예약 시간 변경 실패:', err);
      setError(err?.message || '예약 시간을 변경하는 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setBusyItemId('');
    }
  };

  const handlePublishNow = async (item) => {
    if (!window.confirm('이 글을 즉시 공개할까요? 예약 목록에서 제거됩니다.')) {
      return;
    }
    const now = new Date();
    setBusyItemId(item.id);
    setFeedback('');
    try {
      await updateIssue(item.id, { date: formatKoreanDateTime(now) }, { visibilityMode: 'immediate', visibleAfter: now });
      setScheduledItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setScheduleInputs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setFeedback('글을 즉시 공개했습니다.');
    } catch (err) {
      console.error('즉시 공개 실패:', err);
      setError(err?.message || '즉시 공개 처리 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setBusyItemId('');
    }
  };

  const handleDelete = async (item) => {
    const ok = window.confirm('이 예약 항목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.');
    if (!ok) {
      return;
    }
    setBusyItemId(item.id);
    setFeedback('');
    try {
      await deleteIssue(item.id);
      setScheduledItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setScheduleInputs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setFeedback('예약 항목이 삭제되었습니다.');
    } catch (err) {
      console.error('예약 항목 삭제 실패:', err);
      setError(err?.message || '예약 항목을 삭제하는 중 오류가 발생했습니다. Firestore 권한을 확인하세요.');
    } finally {
      setBusyItemId('');
    }
  };

  const groupedReservations = useMemo(() => {
    const groups = new Map();
    scheduledItems.forEach((item) => {
      if (!groups.has(item.theme)) {
        groups.set(item.theme, []);
      }
      groups.get(item.theme).push(item);
    });
    groups.forEach((items) => {
      items.sort((a, b) => {
        const aTime = a.visibleAfter instanceof Date ? a.visibleAfter.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.visibleAfter instanceof Date ? b.visibleAfter.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    });
    return groups;
  }, [scheduledItems]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">예약 노출 관리</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          예약작성 버튼으로 추가된 글은 이곳에 모여요. 테마별 간격을 조정하고, 필요할 때 즉시 공개하거나 시간을 변경하세요.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">예약 데이터를 불러오는 중입니다...</p>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">테마별 예약 간격</h2>
            <div className="space-y-3">
              {availableThemes.map((theme) => (
                <ThemeIntervalRow
                  key={theme.id}
                  theme={theme}
                  value={intervalInputs[theme.id] ?? ''}
                  nextVisibleAt={settings?.intervals?.[theme.id]?.nextVisibleAt ?? null}
                  onChange={(value) => handleIntervalInputChange(theme.id, value)}
                  onSave={() => handleSaveInterval(theme.id)}
                  isSaving={savingThemeId === theme.id}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">예약된 글 목록</h2>
            {scheduledItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">아직 예약된 글이 없습니다. 예약작성 버튼으로 글을 추가해 주세요.</p>
            ) : (
              Array.from(groupedReservations.entries())
                .filter(([themeId]) => availableThemes.some((theme) => theme.id === themeId))
                .map(([themeId, items]) => (
                  <div key={themeId} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {getThemeLabel(themeId)} ({items.length}건)
                    </h3>
                    <div className="space-y-3">
                    {items.map((item) => (
                      <ReservationCard
                        key={item.id}
                        item={item}
                        scheduleValue={scheduleInputs[item.id] ?? ''}
                        onScheduleChange={(value) => handleScheduleInputChange(item.id, value)}
                        onApplySchedule={() => handleApplySchedule(item)}
                        onPublishNow={() => handlePublishNow(item)}
                        onDelete={() => handleDelete(item)}
                        isBusy={busyItemId === item.id}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </section>
  );
}
