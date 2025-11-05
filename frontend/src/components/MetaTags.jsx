// frontend/src/components/MetaTags.jsx
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

function buildCanonical(url) {
  try {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (!href) return '';
    const u = new URL(href);
    // Netlify 배포 도메인 고정(필요 시 www 붙이면 여기서 정규화)
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function MetaTags({ title, description, url, image, type }) {
  const siteName = 'infoall';
  const resolvedTitle = title || 'infoall - 테마별 맞춤 정보';
  const resolvedDescription =
    description ||
    '사건/정책, 육아, 생활, 건강 등 다양한 테마의 최신 정보를 한눈에 살펴보세요.';
  const resolvedUrl = buildCanonical(url);
  const resolvedImage = image || 'https://infoall.netlify.app/og-default.png'; // 없으면 추후 정적 파일 추가 권장
  const resolvedType = type || 'website';

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />

      {/* Canonical */}
      {resolvedUrl && <link rel="canonical" href={resolvedUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={resolvedType} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
      <meta property="og:image" content={resolvedImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />

      {/* 참고: SPA Helmet은 일부 크롤러에서 한계가 있으므로 장기적으로 프리렌더/SSR을 검토하세요. */}
    </Helmet>
  );
}

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string,
  image: PropTypes.string,
  type: PropTypes.string
};

MetaTags.defaultProps = {
  title: '',
  description: '',
  url: '',
  image: '',
  type: ''
};

export default MetaTags;
