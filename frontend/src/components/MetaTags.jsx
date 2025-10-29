// frontend/src/components/MetaTags.jsx
// react-helmet-async를 이용해 각 페이지별 메타 태그를 정의한다.
// 현재 앱은 완전한 클라이언트 렌더링이므로 SNS 봇에 노출하려면 추후 프리렌더/SSR을 도입해야 한다.

import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

function MetaTags({ title, description, url }) {
  const resolvedTitle = title || '사건 프레임 아카이브';
  const resolvedDescription =
    description || '정책/사건의 배경을 먼저 이해하고, 필요 시 주요 쟁점과 진영별 시각을 함께 살펴보는 아카이브입니다.';
  const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* TODO: SPA 클라이언트에서 메타 태그를 주입하므로 일부 SNS/메신저 미리보기에는 반영되지 않을 수 있다. 장기적으로는 SSR 또는 프리렌더 전략을 도입해야 한다. */}
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />

      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:type" content="article" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
    </Helmet>
  );
}

MetaTags.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  url: PropTypes.string,
};

MetaTags.defaultProps = {
  title: '',
  description: '',
  url: '',
};

export default MetaTags;
