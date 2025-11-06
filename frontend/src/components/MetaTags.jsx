// frontend/src/components/MetaTags.jsx
// SEO/OG 메타 태그: noindex 지원 + 캐노니컬 호스트 고정(VITE_SITE_ORIGIN) + locale/기본값 개선
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

function buildCanonical(url) {
  try {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (!href) return '';
    const u = new URL(href);

    // 환경변수로 호스트 고정(예: https://infoall.netlify.app 또는 커스텀 도메인)
    const siteOrigin = import.meta?.env?.VITE_SITE_ORIGIN;
    if (siteOrigin) {
      const base = new URL(siteOrigin);
      u.protocol = base.protocol;
      u.host = base.host; // host만 교체(경로/쿼리는 유지)
    }
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function MetaTags({ title, description, url, image, type, noindex }) {
  const siteName = 'infoall';
  const resolvedTitle = title || 'infoall - 테마별 맞춤 정보';
  const resolvedDescription =
    description ||
    '정책·주식·육아·생활·건강·정부지원 정보를 한 곳에서 빠르게 확인하세요.';
  const resolvedUrl = buildCanonical(url);
  const resolvedImage = image || 'https://infoall.netlify.app/og-default.png';
  const resolvedType = type || 'website';

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Canonical */}
      {resolvedUrl && <link rel="canonical" href={resolvedUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={resolvedType} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:locale" content="ko_KR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />

      {/* 참고: SPA Helmet은 일부 크롤러에서 한계가 있으니 장기적으로 프리렌더/SSR 검토 권장 */}
    </Helmet>
  );
}

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string,
  image: PropTypes.string,
  type: PropTypes.string,
  noindex: PropTypes.bool
};

MetaTags.defaultProps = {
  title: '',
  description: '',
  url: '',
  image: '',
  type: '',
  noindex: false
};

export default MetaTags;
