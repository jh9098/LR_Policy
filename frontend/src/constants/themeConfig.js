// frontend/src/constants/themeConfig.js
// infoall 서비스에서 사용하는 테마 정의를 한곳에 모은다.
// Firestore `issues` 문서에는 theme 필드를 저장하며, 이 파일이 단일 진실(Single Source of Truth)이다.

export const DEFAULT_THEME_ID = 'policy';

export const THEME_CONFIG = [
  {
    id: 'policy',
    label: '사건/정책',
    description:
      '주요 정책 변화와 사회적 사건을 요약하고 진보/보수 시각을 비교합니다.',
    accent: 'indigo',
    showPerspectives: true,
    keyAreas: ['핵심 요약', '진보 시각', '보수 시각', '생활 영향', '공식/언론 출처']
  },
  {
    id: 'stocks',
    label: '주식정보',
    description:
      '최신 시장 동향, 섹터/기업 분석, 그리고 투자 전략까지.',
    accent: 'amber',
    showPerspectives: false,
    keyAreas: ['시장 동향', '섹터 분석', '기업 분석', '투자 전략', '공시/뉴스']
  },
  {
    id: 'ai',
    label: 'AI 정보',
    description:
      'AI 개념 정리부터 도구 활용, 자동화, 수익화, 정책 이슈까지 한 번에 정리합니다.',
    accent: 'cyan',
    showPerspectives: false,
    keyAreas: [
      'AI 기초·트렌드',
      'AI 도구·서비스 활용',
      '업무·생산성·자동화',
      '코딩·노코드·워크플로 자동화',
      'AI 부업·창업·수익화',
      '콘텐츠 제작·유튜브·블로그',
      '교육·육아·자기계발에서의 AI',
      'AI 이슈·윤리·정책',
      'AI 툴·사례 아카이브'
    ]
  },
  {
    id: 'parenting',
    label: '육아정보',
    description:
      '임신·출산부터 학령기까지 연령대별 가이드와 체크리스트를 제공합니다.',
    accent: 'sky',
    showPerspectives: false,
    // 합의된 개편 반영: 0~7세 통합, 학령 구간 정리
    keyAreas: ['임신/출산준비', '영유아(0~7세)', '초등학생', '중학생', '고등학생', '긴급 연락처']
  },
  {
    id: 'lifestyle',
    label: '생활정보',
    description:
      '일상에 바로 쓰는 행정·금융·소비·생활관리부터 주거·교통·법률·직장·교육·디지털·여행·반려·식생활·환경·로컬·문화까지 전 생활 영역을 단계별로 안내합니다.',
    accent: 'violet',
    showPerspectives: false,
    // 카테고리 스펙 그대로 키 영역에 노출(탭/필터 등에 활용)
    keyAreas: [
      '행정/정부 서비스',
      '금융/세무',
      '소비/쇼핑',
      '생활관리',
      '주거/부동산',
      '교통/운전',
      '법률/권리',
      '직장/노무',
      '교육/자기계발',
      '디지털/보안',
      '여행/레저',
      '반려동물',
      '식생활/요리',
      '환경/안전',
      '커뮤니티/로컬생활',
      '문화/취미'
    ]
  },
  {
    id: 'health',
    label: '건강정보',
    description:
      '질병관리(병명 심층)를 중심으로 정신건강·생애주기·예방/응급·증상·검사/수치 가이드를 제공합니다.',
    accent: 'emerald',
    showPerspectives: false,
    // 질병명 심층은 ‘질병관리’에서만, 다른 축은 상황/과정 중심
    keyAreas: ['질병관리', '정신건강', '생애주기 건강', '예방/응급', '증상별 가이드', '검사/수치 해석']
  },
  {
    id: 'groupbuy',
    label: '공동구매정보',
    description:
      '육아·생활·식품·패션 공동구매 소식을 한 곳에 모아, 품목별 필수 스펙과 구매 체크포인트를 정리합니다.',
    accent: 'rose',
    showPerspectives: false,
    keyAreas: ['육아용품', '생활용품', '식품·건강식품', '패션·가전·인테리어']
  },
  {
    id: 'support',
    label: '정부지원정보',
    description:
      '정부·지자체 지원금/바우처/공공서비스를 한눈에. 자격·혜택·서류·신청 절차를안내합니다. (의료/건강 지원 포함)',
    accent: 'purple',
    showPerspectives: false,
    // 의료/건강 지원(재난적의료비, 산정특례, 국가암검진 등) 명시 반영
    keyAreas: [
      '생활지원',
      '육아/교육',
      '취업/창업',
      '주거/복지',
      '금융/세제',
      '문화/체육/여행',
      '디지털/환경',
      '재난/안전',
      '지역/지자체',
      '의료/건강 지원',
      '신청방법'
    ]
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
