// frontend/src/pages/admin/AdminListPage.jsx
// Firestore Web SDK로 직접 목록을 불러오고 삭제한다. Render 백엔드를 호출하지 않는다.
// 현재 누구나 /admin/list 에 접근하면 Firestore 문서를 삭제할 수 있다. TODO: 프로덕션에서는 접근 제한과 보안 규칙 강화가 필요하다.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteIssue, getIssuesByTheme, getRecentIssues } from '../../firebaseClient.js';
import { getThemeLabel, THEME_CONFIG } from '../../constants/themeConfig.js';

const ITEMS_PER_PAGE = 20;

function buildPaginationItems(totalPages, currentPage) {
  if (totalPages <= 1) return [];
  const siblings = 1;
  const items = [];
  const firstPage = 1;
  const lastPage = totalPages;
  const startPage = Math.max(firstPage + 1, currentPage - siblings);
  const endPage = Math.min(lastPage - 1, currentPage + siblings);

  items.push({ type: 'page', page: firstPage });

  if (startPage > firstPage + 1) {
    items.push({ type: 'ellipsis', key: 'start-ellipsis' });
  }

  for (let page = startPage; page <= endPage; page += 1) {
    if (page <= firstPage || page >= lastPage) continue;
    items.push({ type: 'page', page });
  }

  if (endPage < lastPage - 1) {
    items.push({ type: 'ellipsis', key: 'end-ellipsis' });
  }

  if (lastPage !== firstPage) {
    items.push({ type: 'page', page: lastPage });
  }

  return items;
}

function AdminListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [themeFilter, setThemeFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const data =
          themeFilter === 'all'
            ? await getRecentIssues(120)
            : await getIssuesByTheme(themeFilter, { sort: 'recent', limitCount: 120 });
        if (!isMounted) return;
        setItems(data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Firestore 목록 불러오기 실패:', err);
        setError('Firestore에서 이슈 목록을 불러오지 못했습니다. 네트워크와 권한을 확인하세요.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [themeFilter]);

  const handleDelete = async (id, title) => {
    if (!id) return;
    const ok = window.confirm(`정말로 "${title}" 문서를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;

    try {
      await deleteIssue(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      window.alert('삭제 완료');
    } catch (err) {
      console.error('Firestore 삭제 실패:', err);
      setError(err?.message || '삭제 중 오류가 발생했습니다. Firestore 설정을 확인하세요.');
    }
  };

  const filtered = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return items;
    return items.filter((it) => {
      const hay = `${it.title || ''} ${it.easySummary || ''} ${it.summaryCard || ''} ${it.category || ''}`.toLowerCase();
      return hay.includes(trimmedKeyword);
    });
  }, [items, keyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [themeFilter, keyword]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 0;

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) setCurrentPage(1);
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    if (totalPages <= 1) return filtered;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage, totalPages]);

  const paginationItems = useMemo(
    () => buildPaginationItems(totalPages, currentPage),
    [totalPages, currentPage]
  );

  const startNumber = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endNumber = totalItems === 0 ? 0 : Math.min(totalItems, currentPage * ITEMS_PER_PAGE);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">등록된 글 목록</h2>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setThemeFilter('all')}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                  themeFilter === 'all'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400/70 dark:bg-indigo-500/10 dark:text-indigo-200'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-200'
                }`}
                aria-pressed={themeFilter === 'all'}
              >
                전체
              </button>
              {THEME_CONFIG.map((theme) => {
                const isActive = themeFilter === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeFilter(theme.id)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400/70 dark:bg-indigo-500/10 dark:text-indigo-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-200'
                    }`}
                    aria-pressed={isActive}
                  >
                    {theme.label}
                  </button>
                );
              })}
            </div>

            <label className="block max-w-lg text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">키워드</span>
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="제목/요약/카테고리 검색"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              총 {totalItems}건 중 {startNumber}-{endNumber} 표시
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/new')}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
        >
          새 글 작성하기
        </button>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-100/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white text-left shadow-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-4 py-3">테마</th>
              <th scope="col" className="px-4 py-3">날짜</th>
              <th scope="col" className="px-4 py-3">카테고리</th>
              <th scope="col" className="px-4 py-3">제목</th>
              <th scope="col" className="px-4 py-3">요약</th>
              <th scope="col" className="px-4 py-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</td>
              </tr>
            ) : totalItems === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-300">등록된 문서가 없습니다. 새 글을 작성해 주세요.</td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{getThemeLabel(item.theme)}</td>
                  <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{item.date || '정보 부족'}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                      {item.category || '기타'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{item.title || '제목 없음'}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.easySummary || item.summaryCard || ''}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        to={`/admin/edit/${item.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                      >수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-900"
                      >삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="등록 글 페이지 이동"
        >
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900 disabled:dark:border-slate-800 disabled:dark:text-slate-500"
            disabled={currentPage === 1}
          >
            이전
          </button>
          <div className="flex flex-wrap items-center gap-1">
            {paginationItems.map((item) =>
              item.type === 'ellipsis' ? (
                <span key={item.key} className="px-2 text-xs text-slate-400 dark:text-slate-500">
                  …
                </span>
              ) : (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setCurrentPage(item.page)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    currentPage === item.page
                      ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-200'
                  }`}
                  aria-current={currentPage === item.page ? 'page' : undefined}
                >
                  {item.page}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900 disabled:dark:border-slate-800 disabled:dark:text-slate-500"
            disabled={currentPage === totalPages}
          >
            다음
          </button>
        </nav>
      ) : null}
    </section>
  );
}

export default AdminListPage;
