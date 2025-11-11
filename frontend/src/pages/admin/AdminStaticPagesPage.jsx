import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getStaticPageContent,
  getStaticPageHistory,
  getTrendingSettings,
  getSectionTitles,
  saveSectionTitles,
  saveStaticPageContent,
  saveTrendingSettings
} from '../../firebaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSectionTitles } from '../../contexts/SectionTitlesContext.jsx';
import {
  SECTION_TITLE_FIELD_GROUPS,
  mergeSectionTitles,
  getSectionTitleValue,
  getDefaultSectionTitleValue,
  setValueAtPath
} from '../../constants/sectionTitleConfig.js';
import SignupFormSettingsEditor from '../../components/admin/SignupFormSettingsEditor.jsx';

function buildSectionTitleFormValues(sourceTitles) {
  const merged = mergeSectionTitles(sourceTitles);
  const values = {};
  SECTION_TITLE_FIELD_GROUPS.forEach((group) => {
    group.fields.forEach((field) => {
      values[field.path] = getSectionTitleValue(merged, field.path);
    });
  });
  return values;
}

const STATIC_PAGE_ITEMS = [
  {
    slug: 'company-overview',
    label: '회사소개',
    description: '회사 연혁, 핵심 가치, 비전을 안내하는 페이지입니다.',
    defaultTitle: '회사소개',
    placeholder: '회사 연혁, 비전, 핵심 가치 등을 자유롭게 작성해주세요.',
    publicPath: '/company'
  },
  {
    slug: 'partnership-guide',
    label: '제휴안내',
    description: '제휴 문의 채널과 진행 절차를 정리합니다.',
    defaultTitle: '제휴안내',
    placeholder: '제휴 문의 담당자, 연락처, 진행 절차 등을 작성해주세요.',
    publicPath: '/partnership'
  },
  {
    slug: 'advertising-guide',
    label: '광고안내',
    description: '광고 상품과 집행 절차를 소개합니다.',
    defaultTitle: '광고안내',
    placeholder: '광고 상품 종류, 집행 절차, 제안서 링크 등을 입력해주세요.',
    publicPath: '/advertising'
  },
  {
    slug: 'terms-of-use',
    label: '이용약관',
    description: '서비스 이용약관 전문을 관리합니다.',
    defaultTitle: '이용약관',
    placeholder: '약관 본문을 그대로 붙여넣거나 정리해주세요.',
    publicPath: '/terms'
  },
  {
    slug: 'privacy-policy',
    label: '개인정보처리방침',
    description: '개인정보 처리 및 보호 정책을 게시합니다.',
    defaultTitle: '개인정보처리방침',
    placeholder: '수집 항목, 이용 목적, 보관 기간 등을 작성해주세요.',
    publicPath: '/privacy'
  },
  {
    slug: 'youth-protection',
    label: '청소년보호정책',
    description: '청소년 보호 책임자와 대응 절차를 안내합니다.',
    defaultTitle: '청소년보호정책',
    placeholder: '책임자 정보, 유해정보 차단 정책, 신고 절차 등을 작성해주세요.',
    publicPath: '/youth-protection'
  }
];

const HISTORY_LIMIT = 12;

function formatTimestamp(timestamp) {
  if (!timestamp) return '기록된 시간 없음';
  try {
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    console.warn('타임스탬프 포맷 실패:', error);
    return '기록된 시간 없음';
  }
}

export default function AdminStaticPagesPage() {
  const [activeSlug, setActiveSlug] = useState(STATIC_PAGE_ITEMS[0].slug);
  const [title, setTitle] = useState(STATIC_PAGE_ITEMS[0].defaultTitle);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [trendingSettingsState, setTrendingSettingsState] = useState({ minUpvotes: '5', withinHours: '24', maxItems: '10' });
  const [trendingSaving, setTrendingSaving] = useState(false);
  const [trendingMessage, setTrendingMessage] = useState('');
  const [trendingError, setTrendingError] = useState('');
  const { user } = useAuth();
  const { titles: globalSectionTitles, refresh: refreshSectionTitlesContext } = useSectionTitles();
  const [sectionTitleValues, setSectionTitleValues] = useState(() => buildSectionTitleFormValues(globalSectionTitles));
  const [sectionTitleLoading, setSectionTitleLoading] = useState(true);
  const [sectionTitleSaving, setSectionTitleSaving] = useState(false);
  const [sectionTitleMessage, setSectionTitleMessage] = useState('');
  const [sectionTitleError, setSectionTitleError] = useState('');
  const [sectionTitleMeta, setSectionTitleMeta] = useState({ updatedAt: null, updatedBy: '' });
  const [activeSectionTab, setActiveSectionTab] = useState(SECTION_TITLE_FIELD_GROUPS[0].id);

  const activeItem = useMemo(
    () => STATIC_PAGE_ITEMS.find((item) => item.slug === activeSlug) ?? STATIC_PAGE_ITEMS[0],
    [activeSlug]
  );

  const loadSectionTitles = useCallback(async () => {
    setSectionTitleLoading(true);
    try {
      const data = await getSectionTitles();
      setSectionTitleValues(buildSectionTitleFormValues(data?.titles ?? globalSectionTitles));
      setSectionTitleMeta({ updatedAt: data?.updatedAt ?? null, updatedBy: data?.updatedBy ?? '' });
      setSectionTitleError('');
    } catch (err) {
      console.error('섹션 제목 로드 실패:', err);
      setSectionTitleError('소제목 설정을 불러오지 못했습니다. 기본값이 표시됩니다.');
      setSectionTitleValues(buildSectionTitleFormValues(globalSectionTitles));
    } finally {
      setSectionTitleLoading(false);
    }
  }, [globalSectionTitles]);

  useEffect(() => {
    loadSectionTitles();
  }, [loadSectionTitles]);

  const handleSectionTitleChange = useCallback(
    (path) => (event) => {
      const value = event.target.value;
      setSectionTitleValues((prev) => ({ ...prev, [path]: value }));
    },
    []
  );

  const handleResetSectionTitles = useCallback(() => {
    setSectionTitleValues(buildSectionTitleFormValues(mergeSectionTitles()));
    setSectionTitleError('');
    setSectionTitleMessage('기본값을 불러왔습니다. 저장을 눌러 적용하세요.');
  }, []);

  const handleSaveSectionTitles = useCallback(
    async (event) => {
      event.preventDefault();
      setSectionTitleSaving(true);
      setSectionTitleError('');
      setSectionTitleMessage('');
      try {
        const normalized = mergeSectionTitles();
        SECTION_TITLE_FIELD_GROUPS.forEach((group) => {
          group.fields.forEach((field) => {
            const raw = sectionTitleValues[field.path] ?? '';
            const trimmed = typeof raw === 'string' ? raw.trim() : '';
            const fallback = getDefaultSectionTitleValue(field.path);
            const finalValue = trimmed.length > 0 ? trimmed : fallback;
            setValueAtPath(normalized, field.path, finalValue);
          });
        });
        const updatedBy = user?.email || user?.displayName || user?.uid || '관리자';
        await saveSectionTitles(normalized, { updatedBy });
        setSectionTitleValues(buildSectionTitleFormValues(normalized));
        setSectionTitleMeta({ updatedAt: new Date(), updatedBy });
        setSectionTitleMessage('소제목 설정이 저장되었습니다.');
        await refreshSectionTitlesContext();
        await loadSectionTitles();
      } catch (err) {
        console.error('소제목 설정 저장 실패:', err);
        setSectionTitleError('소제목 설정을 저장하지 못했습니다. 입력값을 확인해주세요.');
      } finally {
        setSectionTitleSaving(false);
      }
    },
    [loadSectionTitles, refreshSectionTitlesContext, sectionTitleValues, user]
  );

  const handleChangeTrendingSetting = (field) => (event) => {
    const value = event.target.value;
    setTrendingSettingsState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTrendingSettings = async (event) => {
    event.preventDefault();
    setTrendingSaving(true);
    setTrendingError('');
    setTrendingMessage('');
    try {
      const normalized = {
        minUpvotes: Math.max(Number(trendingSettingsState.minUpvotes) || 0, 0),
        withinHours: Math.max(Number(trendingSettingsState.withinHours) || 0, 0),
        maxItems: Math.max(Math.min(Number(trendingSettingsState.maxItems) || 10, 50), 1)
      };
      const saved = await saveTrendingSettings(normalized);
      setTrendingSettingsState({
        minUpvotes: String(saved.minUpvotes ?? normalized.minUpvotes),
        withinHours: String(saved.withinHours ?? normalized.withinHours),
        maxItems: String(saved.maxItems ?? normalized.maxItems)
      });
      setTrendingMessage('실시간 인기 게시물 조건이 저장되었습니다.');
    } catch (err) {
      console.error('실시간 인기 설정 저장 실패:', err);
      setTrendingError('설정을 저장하지 못했습니다. 입력값을 확인해주세요.');
    } finally {
      setTrendingSaving(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getTrendingSettings()
      .then((settings) => {
        if (!isMounted) return;
        setTrendingSettingsState({
          minUpvotes: String(settings?.minUpvotes ?? 5),
          withinHours: String(settings?.withinHours ?? 24),
          maxItems: String(settings?.maxItems ?? 10)
        });
        setTrendingError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('실시간 인기 설정 불러오기 실패:', err);
        setTrendingError('실시간 인기 게시물 조건을 불러오지 못했습니다.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    setMessage('');

    Promise.all([getStaticPageContent(activeSlug), getStaticPageHistory(activeSlug, HISTORY_LIMIT)])
      .then(([pageData, historyData]) => {
        if (!isMounted) return;
        setTitle(pageData?.title?.trim() || activeItem.defaultTitle);
        setContent(typeof pageData?.content === 'string' ? pageData.content : '');
        setMeta({
          updatedAt: pageData?.updatedAt ?? null,
          updatedBy: pageData?.updatedBy ?? ''
        });
        setHistory(historyData ?? []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('정적 페이지 데이터 로드 실패:', err);
        setError('선택한 페이지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        setTitle(activeItem.defaultTitle);
        setContent('');
        setHistory([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSlug, activeItem.defaultTitle]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!sectionTitleMessage) return;
    const timer = setTimeout(() => setSectionTitleMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [sectionTitleMessage]);

  useEffect(() => {
    if (!trendingMessage) return;
    const timer = setTimeout(() => setTrendingMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [trendingMessage]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeSlug) return;

    setSaving(true);
    setError('');
    setMessage('');

    const normalizedTitle = title.trim() || activeItem.defaultTitle;
    const normalizedContent = content.replace(/\r\n/g, '\n').trimEnd();
    const updatedBy = user?.email || user?.displayName || '관리자';

    try {
      await saveStaticPageContent(activeSlug, {
        title: normalizedTitle,
        content: normalizedContent,
        updatedBy
      });

      const [pageData, historyData] = await Promise.all([
        getStaticPageContent(activeSlug),
        getStaticPageHistory(activeSlug, HISTORY_LIMIT)
      ]);

      setTitle(pageData?.title?.trim() || activeItem.defaultTitle);
      setContent(typeof pageData?.content === 'string' ? pageData.content : '');
      setMeta({
        updatedAt: pageData?.updatedAt ?? null,
        updatedBy: pageData?.updatedBy ?? ''
      });
      setHistory(historyData ?? []);
      setMessage('저장되었습니다.');
    } catch (err) {
      console.error('정적 페이지 저장 실패:', err);
      setError('저장 중 문제가 발생했습니다. 입력값을 확인하거나 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPage = (slug) => {
    if (saving) return;
    setActiveSlug(slug);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">환경/설정</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          회사소개, 약관 등 정적 페이지 내용을 직접 편집할 수 있습니다. 저장 시 Firestore에 자동 반영되고 이력이 남습니다.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">섹션 소제목 관리</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              테마별 상세 페이지에 표시되는 카드 제목과 배지 문구를 수정합니다. 변경 사항은 즉시 사용자 화면에 반영됩니다.
            </p>
          </div>
          {sectionTitleSaving ? (
            <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-300">저장 중…</span>
          ) : null}
        </div>

        {sectionTitleError ? (
          <div className="rounded-lg border border-rose-300 bg-rose-100/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {sectionTitleError}
          </div>
        ) : null}

        {sectionTitleMessage ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-100/70 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {sectionTitleMessage}
          </div>
        ) : null}

        <form onSubmit={handleSaveSectionTitles} className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {SECTION_TITLE_FIELD_GROUPS.map((group) => {
              const isActive = activeSectionTab === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveSectionTab(group.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            {SECTION_TITLE_FIELD_GROUPS.map((group) =>
              group.id === activeSectionTab ? (
                <div key={group.id} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.fields.map((field) => (
                      <label
                        key={field.path}
                        className="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {field.label}
                        {field.multiline ? (
                          <textarea
                            value={sectionTitleValues[field.path] ?? ''}
                            onChange={handleSectionTitleChange(field.path)}
                            className="min-h-[64px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/60"
                            placeholder={field.placeholder}
                            disabled={sectionTitleLoading || sectionTitleSaving}
                          />
                        ) : (
                          <input
                            type="text"
                            value={sectionTitleValues[field.path] ?? ''}
                            onChange={handleSectionTitleChange(field.path)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/60"
                            placeholder={field.placeholder}
                            disabled={sectionTitleLoading || sectionTitleSaving}
                          />
                        )}
                        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                          기본값: {field.placeholder}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null
            )}

            {sectionTitleLoading ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">소제목 설정을 불러오는 중입니다…</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p>마지막 저장: {sectionTitleMeta.updatedAt ? formatTimestamp(sectionTitleMeta.updatedAt) : '기록 없음'}</p>
              {sectionTitleMeta.updatedBy ? <p>수정자: {sectionTitleMeta.updatedBy}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetSectionTitles}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900"
                disabled={sectionTitleSaving}
              >
                기본값으로 복원
              </button>
              <button
                type="submit"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400 dark:hover:bg-indigo-500/80 dark:focus-visible:ring-offset-slate-900"
                disabled={sectionTitleSaving || sectionTitleLoading}
              >
                소제목 저장
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">실시간 인기 게시물 조건</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              홈 화면의 실시간 인기 게시물 10개 영역에 노출될 최소 추천 수와 기간, 표시 개수를 설정합니다.
            </p>
          </div>
          {trendingSaving ? (
            <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-300">저장 중…</span>
          ) : null}
        </div>
        <form onSubmit={handleSaveTrendingSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              최소 추천 수
              <input
                type="number"
                min="0"
                value={trendingSettingsState.minUpvotes}
                onChange={handleChangeTrendingSetting('minUpvotes')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              최근 시간(시간 단위)
              <input
                type="number"
                min="0"
                value={trendingSettingsState.withinHours}
                onChange={handleChangeTrendingSetting('withinHours')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">0으로 설정하면 기간 제한이 없습니다.</span>
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              노출 개수
              <input
                type="number"
                min="1"
                max="50"
                value={trendingSettingsState.maxItems}
                onChange={handleChangeTrendingSetting('maxItems')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              현재 조건: 추천 {trendingSettingsState.minUpvotes || '0'}회 이상,
              {` `}
              {Number(trendingSettingsState.withinHours) > 0
                ? `최근 ${trendingSettingsState.withinHours}시간 이내`
                : '기간 제한 없음'}
              , 최대 {trendingSettingsState.maxItems || '10'}개 노출
            </div>
            <button
              type="submit"
              disabled={trendingSaving}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-indigo-500/80 dark:focus-visible:ring-offset-slate-900"
            >
              설정 저장
            </button>
          </div>
        </form>
        {trendingError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {trendingError}
          </p>
        ) : null}
        {trendingMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            {trendingMessage}
          </p>
        ) : null}
      </section>

      <SignupFormSettingsEditor />

      <div className="flex flex-wrap gap-2">
        {STATIC_PAGE_ITEMS.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => handleSelectPage(item.slug)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400/70 dark:bg-indigo-500/10 dark:text-indigo-200'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activeItem.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeItem.description}</p>
            </div>
            <Link
              to={activeItem.publicPath}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              새 창에서 미리보기
            </Link>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-300 bg-rose-100/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-100/70 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
              {message}
            </div>
          ) : null}

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">페이지 제목</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder={activeItem.defaultTitle}
              disabled={loading || saving}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">본문 내용</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[320px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder={activeItem.placeholder}
              disabled={loading || saving}
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              줄바꿈과 공백은 그대로 저장됩니다. HTML 태그 입력도 가능합니다.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p>
                마지막 업데이트:{' '}
                {meta.updatedAt ? formatTimestamp(meta.updatedAt) : '기록 없음'}
              </p>
              {meta.updatedBy ? <p>수정자: {meta.updatedBy}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-indigo-400 dark:focus-visible:ring-offset-slate-900"
                disabled={loading || saving}
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">변경 이력</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              최대 {HISTORY_LIMIT}개의 최근 저장 기록이 표시됩니다.
            </p>
          </div>

          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              아직 저장 이력이 없습니다.
            </p>
          ) : (
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{item.title || activeItem.defaultTitle}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {formatTimestamp(item.savedAt || item.updatedAt)}
                    {item.updatedBy ? ` · ${item.updatedBy}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}
