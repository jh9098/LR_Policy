import PropTypes from 'prop-types';
import { useMemo } from 'react';
import MetaTags from '../../components/MetaTags.jsx';

export default function StaticPlaceholderPage({ title, description, children }) {
  const fallbackDescription = useMemo(() => description || `${title} 페이지는 준비 중입니다.`, [description, title]);
  const siteUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : ''), []);

  return (
    <section className="space-y-6">
      <MetaTags title={`infoall - ${title}`} description={fallbackDescription} url={siteUrl} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{fallbackDescription}</p>
        {children}
      </div>
    </section>
  );
}

StaticPlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node
};
