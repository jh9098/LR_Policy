// frontend/src/pages/admin/AdminListPage.jsx
// Firestore에서 직접 목록을 읽고 삭제하는 관리자 페이지다. Render 백엔드는 더 이상 호출하지 않는다.
// TODO: 현재 누구나 /admin/list 에 접근하면 Firestore에서 직접 삭제가 가능하다. 프로덕션에서는 인증과 보안 규칙 강화가 필요하다.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteIssue, getRecentIssues } from '../../firebaseClient.js';
import { sortIssuesByDate } from '../../utils/issueSorting.js';

function AdminListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getRecentIssues(100);
        if (!isMounted) {
          return;
        }
        setItems(sortIssuesByDate(data));
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('목록 로드 실패:', err);
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
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
  }, []);

  const handleDelete = async (id, title) => {
    if (!id) {
      return;
    }
    const ok = window.confirm(`정말로 "${title}" 문서를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!ok) {
      return;
    }

    try {
      await deleteIssue(id);
      setItems((prev) => sortIssuesByDate(prev.filter((item) => item.id !== id)));
      alert('삭제 완료');
    } catch (err) {
      console.error('삭제 실패:', err);
      setError(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">등록된 글 목록</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Firestore에서 직접 읽어온 최근 문서 목록입니다. 삭제 버튼은 즉시 DB에서 제거하므로 주의하세요.
          </p>
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
              <th scope="col" className="px-4 py-3">
                날짜
              </th>
              <th scope="col" className="px-4 py-3">
                카테고리
              </th>
              <th scope="col" className="px-4 py-3">
                제목
              </th>
              <th scope="col" className="px-4 py-3">
                요약
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-300">
                  데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-300">
                  등록된 문서가 없습니다. 새 글을 작성해 주세요.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{item.date}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{item.title}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.easySummary || item.summaryCard}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        to={`/admin/edit/${item.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                      >
                        보기 / 수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus-visible:ring-offset-slate-900"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        TODO: 실제 운영 단계에서는 이 목록/삭제 기능 전체에 인증과 접근 제어를 추가해야 합니다.
      </p>
    </section>
  );
}

export default AdminListPage;
