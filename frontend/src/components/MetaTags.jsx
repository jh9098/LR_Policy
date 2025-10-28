// frontend/src/components/MetaTags.jsx
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

function MetaTags({ title, description, url }) {
  const safeTitle = title || '사건 프레임 아카이브';
  const safeDescription =
    description || '주요 사건에 대한 서로 다른 프레임(진보/보수 등)을 한눈에 비교하는 아카이브입니다.';
  const safeUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* TODO: 현재는 SPA 환경에서 클라이언트가 메타 태그를 주입하므로, 일부 SNS 크롤러에서는 OG 정보가 반영되지 않을 수 있다. 추후 SSR 또는 서버 렌더링이 필요하다. */}
      <title>{safeTitle}</title>
      <meta name="description" content={safeDescription} />

      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:url" content={safeUrl} />
      <meta property="og:type" content="article" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDescription} />
    </Helmet>
  );
}

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string
};

MetaTags.defaultProps = {
  title: '',
  description: '',
  url: ''
};

export default MetaTags;
