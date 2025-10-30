// frontend/src/constants/themeConfig.js
// infoall 서비스에서 사용하는 테마 정의를 한곳에 모은다.
// Firestore `issues` 문서에는 theme 필드를 저장하며, 이 파일이 단일 진실(Single Source of Truth)이다.

export const DEFAULT_THEME_ID = 'policy';

export const THEME_CONFIG = [
  {
    id: 'policy',
    label: '사건/정책',
    description:
      '주요 정책 변화와 사회적 사건을 요약하고 진보/보수 시각을 비교합니다. 기존 "사건 프레임" 콘텐츠가 이 테마로 이동했습니다.',
    accent: 'indigo',
    showPerspectives: true
  },
  {
    id: 'parenting',
    label: '육아정보',
    description:
      '임신, 출산, 영유아 발달과 같은 육아 전반의 정보를 정리합니다. 실용적인 체크리스트와 신뢰할 수 있는 자료를 중심으로 큐레이션합니다.',
    accent: 'rose',
    showPerspectives: false
  },
  {
    id: 'lifestyle',
    label: '생활정보',
    description:
      '일상 생활에 바로 적용할 수 있는 행정, 금융, 소비자 생활 팁을 제공합니다. 복잡한 절차는 단계별 가이드로 설명합니다.',
    accent: 'emerald',
    showPerspectives: false
  },
  {
    id: 'health',
    label: '건강정보',
    description:
      '예방의학, 운동, 정신건강 등 건강 전반을 다룹니다. 공공기관 자료와 전문가 의견을 바탕으로 최신 정보를 전달합니다.',
    accent: 'sky',
    showPerspectives: false
  }
];

export const THEME_ID_SET = new Set(THEME_CONFIG.map((theme) => theme.id));

export function isValidThemeId(themeId) {
  return THEME_ID_SET.has(themeId);
}

export function getThemeById(themeId) {
  if (!themeId) {
    return THEME_CONFIG.find((theme) => theme.id === DEFAULT_THEME_ID) ?? THEME_CONFIG[0];
  }
  return THEME_CONFIG.find((theme) => theme.id === themeId) ?? THEME_CONFIG[0];
}

export function getThemeLabel(themeId) {
  return getThemeById(themeId).label;
}

export const THEME_NAV_ITEMS = THEME_CONFIG.map((theme) => ({
  id: theme.id,
  label: theme.label,
  to: `/theme/${theme.id}`
}));
