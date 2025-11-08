import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { getStaticPageContent } from '../../firebaseClient.js';

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return '';
  try {
    const date = typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : new Date(updatedAt);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    console.warn('정적 페이지 업데이트 시간 포맷에 실패했습니다.', error);
    return '';
  }
}

export default function StaticContentPage({ slug, defaultTitle, defaultDescription }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    getStaticPageContent(slug)
      .then((data) => {
        if (!isMounted || !data) return;
        setTitle(data.title?.trim() || defaultTitle);
        setContent(typeof data.content === 'string' ? data.content : '');
        setUpdatedAt(data.updatedAt ?? null);
        setUpdatedBy(data.updatedBy ?? '');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('정적 페이지 로드 실패:', err);
        setError('페이지 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        setTitle(defaultTitle);
        setContent('');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, defaultTitle]);

  const formattedUpdatedAt = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);

  const hasContent = Boolean(content && content.trim().length > 0);

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{defaultDescription}</p>
        {formattedUpdatedAt ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            최근 업데이트: {formattedUpdatedAt}
            {updatedBy ? ` · ${updatedBy}` : ''}
          </p>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          내용을 불러오는 중입니다...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-100/80 px-6 py-6 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      ) : hasContent ? (
        <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-white px-6 py-6 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {content}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          아직 등록된 내용이 없습니다. 상단 메뉴의 관리자 &gt; 환경/설정에서 내용을 등록해주세요.
        </div>
      )}
    </article>
  );
}

StaticContentPage.propTypes = {
  slug: PropTypes.string.isRequired,
  defaultTitle: PropTypes.string.isRequired,
  defaultDescription: PropTypes.string.isRequired
};
