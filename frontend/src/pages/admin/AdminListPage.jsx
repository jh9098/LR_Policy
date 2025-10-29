// frontend/src/pages/admin/AdminListPage.jsx
// Firestore Web SDK로 직접 목록을 불러오고 삭제한다. Render 백엔드를 호출하지 않는다.
// 현재 누구나 /admin/list 에 접근하면 Firestore 문서를 삭제할 수 있다. TODO: 프로덕션에서는 접근 제한과 보안 규칙 강화가 필요하다.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteIssue, getRecentIssues } from '../../firebaseClient.js';

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
        const data = await getRecentIssues(50);
        if (!isMounted) {
          return;
        }
        setItems(data);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Firestore 목록 불러오기 실패:', err);
        setError('Firestore에서 이슈 목록을 불러오지 못했습니다. 네트워크와 권한을 확인하세요.');
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
      setItems((prev) => prev.filter((item) => item.id !== id));
      window.alert('삭제 완료');
    } catch (err) {
      console.error('Firestore 삭제 실패:', err);
      setError(err?.message || '삭제 중 오류가 발생했습니다. Firestore 설정을 확인하세요.');
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">등록된 글 목록</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Firestore에서 직접 불러온 최근 문서를 확인합니다. 삭제 버튼을 누르면 즉시 Firestore에서 제거되므로 주의하세요.
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
