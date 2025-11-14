// frontend/src/constants/sectionTitleConfig.js
// 상세 페이지 섹션 제목/배지 기본값과 편집 UI 구성을 정의한다.
// Firestore에 저장된 사용자 정의 문구가 없다면 여기 정의된 기본값을 사용한다.

import { THEME_CONFIG } from './themeConfig.js';

// THEME_CONFIG에서 id -> label 매핑을 만들어 UI에서 재사용한다.
const THEME_LABEL_MAP = THEME_CONFIG.reduce((acc, theme) => {
  acc[theme.id] = theme.label;
  return acc;
}, {});

// 기본 소제목/배지 문구. Firestore 저장 시 이 구조를 그대로 사용한다.
export const DEFAULT_SECTION_TITLES = Object.freeze({
  general: {
    easySummary: { title: '쉬운 요약' },
    background: { title: '무슨 일이 있었나요?' },
    keyPoints: { title: '핵심 쟁점 정리' },
    progressiveView: { title: '진보 성향에서 보는 전망', badge: '진보 시각' },
    conservativeView: { title: '보수 성향에서 보는 전망', badge: '보수 시각' },
    impactToLife: { title: '생활에 어떤 영향이 있나요?', badge: '체감 영향' },
    sources: { title: '근거 자료' },
    relatedLinks: { title: '관련 링크' }
  },
  themes: {
    ai: {
      summaryCard: { title: '요약 카드', badge: '요약' },
      background: { title: '배경 설명', badge: '배경' },
      keyActionSteps: { title: '핵심 실행 단계', badge: '실행' },
      impact: { title: '생활/업무 영향', badge: '영향' },
      connectionGuides: { title: '연결 가이드', badge: '연결' },
      categoryBlueprint: { title: '카테고리별 추천 구조', badge: '구조' },
      subcategoryFocus: { title: '하위카테고리 포커스', badge: '포커스' }
    },
    parenting: {
      overview: { title: '육아 테마 개요' },
      generalTips: { title: '전체 공통 팁', badge: 'TIP' },
      ageGroupFallback: { title: '연령대' },
      ageGroups: { badge: '육아' },
      emergencyContacts: { title: '긴급/상담 연락처', badge: '긴급' }
    },
    health: {
      overview: { title: '건강 테마 개요' },
      lifestyleTips: { title: '생활 습관 팁', badge: '생활' },
      conditionFallback: { title: '건강 주제' },
      conditions: { badge: '건강' },
      emergencyGuide: { title: '긴급 대응 가이드', badge: '긴급' }
    },
    lifestyle: {
      overview: { title: '생활정보 개요' },
      quickTips: { title: '생활 꿀팁', badge: 'TIP' },
      hotItems: { title: '추천 아이템', badge: '아이템' },
      hotDeals: { title: '핫딜 정보', badge: '딜' },
      affiliateNotes: { title: '제휴/운영 노트', badge: '운영' }
    },
    stocks: {
      overview: { title: '주식정보 개요' },
      marketSummary: { title: '시장 요약' },
      sectorHighlights: { title: '섹터 하이라이트', badge: '섹터' },
      companyAnalyses: { title: '기업 분석', badge: '기업' },
      watchlist: { title: '워치리스트', badge: '관찰' }
    },
    support: {
      overview: { title: '정부지원정보 개요' },
      programs: { badge: '지원', fallbackTitle: '지원 프로그램' },
      commonResources: { title: '공통 참고자료', badge: '참고' }
    },
    groupbuy: {
      linkSection: { title: '관련 링크', note: '위 링크에서 공동구매 참여 가능합니다!' }
    }
  }
});

// UI에서 입력 필드를 렌더링하기 위한 그룹 구성.
export const SECTION_TITLE_FIELD_GROUPS = [
  {
    id: 'general',
    label: '공통 섹션',
    description: '모든 테마에서 공통으로 사용하는 카드 소제목입니다.',
    fields: [
      {
        path: 'general.easySummary.title',
        label: '쉬운 요약 카드 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.easySummary.title
      },
      {
        path: 'general.background.title',
        label: '배경 설명 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.background.title
      },
      {
        path: 'general.keyPoints.title',
        label: '핵심 쟁점 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.keyPoints.title
      },
      {
        path: 'general.progressiveView.title',
        label: '진보 시각 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.progressiveView.title
      },
      {
        path: 'general.progressiveView.badge',
        label: '진보 시각 배지 문구',
        placeholder: DEFAULT_SECTION_TITLES.general.progressiveView.badge
      },
      {
        path: 'general.conservativeView.title',
        label: '보수 시각 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.conservativeView.title
      },
      {
        path: 'general.conservativeView.badge',
        label: '보수 시각 배지 문구',
        placeholder: DEFAULT_SECTION_TITLES.general.conservativeView.badge
      },
      {
        path: 'general.impactToLife.title',
        label: '생활 영향 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.impactToLife.title
      },
      {
        path: 'general.impactToLife.badge',
        label: '생활 영향 배지 문구',
        placeholder: DEFAULT_SECTION_TITLES.general.impactToLife.badge
      },
      {
        path: 'general.sources.title',
        label: '근거 자료 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.sources.title
      },
      {
        path: 'general.relatedLinks.title',
        label: '관련 링크 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.general.relatedLinks.title
      }
    ]
  },
  {
    id: 'ai',
    label: `${THEME_LABEL_MAP.ai || 'AI 정보'} 테마`,
    description: 'AI 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.ai.summaryCard.title',
        label: '요약 카드 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.summaryCard.title
      },
      {
        path: 'themes.ai.summaryCard.badge',
        label: '요약 카드 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.summaryCard.badge
      },
      {
        path: 'themes.ai.background.title',
        label: '배경 설명 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.background.title
      },
      {
        path: 'themes.ai.background.badge',
        label: '배경 설명 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.background.badge
      },
      {
        path: 'themes.ai.keyActionSteps.title',
        label: '핵심 실행 단계 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.keyActionSteps.title
      },
      {
        path: 'themes.ai.keyActionSteps.badge',
        label: '핵심 실행 단계 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.keyActionSteps.badge
      },
      {
        path: 'themes.ai.impact.title',
        label: '생활/업무 영향 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.impact.title
      },
      {
        path: 'themes.ai.impact.badge',
        label: '생활/업무 영향 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.impact.badge
      },
      {
        path: 'themes.ai.connectionGuides.title',
        label: '연결 가이드 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.connectionGuides.title
      },
      {
        path: 'themes.ai.connectionGuides.badge',
        label: '연결 가이드 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.connectionGuides.badge
      },
      {
        path: 'themes.ai.categoryBlueprint.title',
        label: '카테고리별 추천 구조 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.categoryBlueprint.title
      },
      {
        path: 'themes.ai.categoryBlueprint.badge',
        label: '카테고리별 추천 구조 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.categoryBlueprint.badge
      },
      {
        path: 'themes.ai.subcategoryFocus.title',
        label: '하위카테고리 포커스 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.subcategoryFocus.title
      },
      {
        path: 'themes.ai.subcategoryFocus.badge',
        label: '하위카테고리 포커스 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.ai.subcategoryFocus.badge
      }
    ]
  },
  {
    id: 'parenting',
    label: `${THEME_LABEL_MAP.parenting || '육아정보'} 테마`,
    description: '육아 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.parenting.overview.title',
        label: '개요 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.overview.title
      },
      {
        path: 'themes.parenting.generalTips.title',
        label: '전체 공통 팁 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.generalTips.title
      },
      {
        path: 'themes.parenting.generalTips.badge',
        label: '전체 공통 팁 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.generalTips.badge
      },
      {
        path: 'themes.parenting.ageGroupFallback.title',
        label: '연령대 카드 기본 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.ageGroupFallback.title
      },
      {
        path: 'themes.parenting.ageGroups.badge',
        label: '연령대 카드 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.ageGroups.badge
      },
      {
        path: 'themes.parenting.emergencyContacts.title',
        label: '긴급/상담 연락처 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.emergencyContacts.title
      },
      {
        path: 'themes.parenting.emergencyContacts.badge',
        label: '긴급/상담 연락처 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.parenting.emergencyContacts.badge
      }
    ]
  },
  {
    id: 'health',
    label: `${THEME_LABEL_MAP.health || '건강정보'} 테마`,
    description: '건강 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.health.overview.title',
        label: '개요 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.overview.title
      },
      {
        path: 'themes.health.lifestyleTips.title',
        label: '생활 습관 팁 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.lifestyleTips.title
      },
      {
        path: 'themes.health.lifestyleTips.badge',
        label: '생활 습관 팁 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.lifestyleTips.badge
      },
      {
        path: 'themes.health.conditionFallback.title',
        label: '건강 주제 기본 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.conditionFallback.title
      },
      {
        path: 'themes.health.conditions.badge',
        label: '건강 주제 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.conditions.badge
      },
      {
        path: 'themes.health.emergencyGuide.title',
        label: '긴급 대응 가이드 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.emergencyGuide.title
      },
      {
        path: 'themes.health.emergencyGuide.badge',
        label: '긴급 대응 가이드 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.health.emergencyGuide.badge
      }
    ]
  },
  {
    id: 'lifestyle',
    label: `${THEME_LABEL_MAP.lifestyle || '생활정보'} 테마`,
    description: '생활정보 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.lifestyle.overview.title',
        label: '개요 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.overview.title
      },
      {
        path: 'themes.lifestyle.quickTips.title',
        label: '생활 꿀팁 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.quickTips.title
      },
      {
        path: 'themes.lifestyle.quickTips.badge',
        label: '생활 꿀팁 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.quickTips.badge
      },
      {
        path: 'themes.lifestyle.hotItems.title',
        label: '추천 아이템 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.hotItems.title
      },
      {
        path: 'themes.lifestyle.hotItems.badge',
        label: '추천 아이템 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.hotItems.badge
      },
      {
        path: 'themes.lifestyle.hotDeals.title',
        label: '핫딜 정보 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.hotDeals.title
      },
      {
        path: 'themes.lifestyle.hotDeals.badge',
        label: '핫딜 정보 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.hotDeals.badge
      },
      {
        path: 'themes.lifestyle.affiliateNotes.title',
        label: '제휴/운영 노트 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.affiliateNotes.title
      },
      {
        path: 'themes.lifestyle.affiliateNotes.badge',
        label: '제휴/운영 노트 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.lifestyle.affiliateNotes.badge
      }
    ]
  },
  {
    id: 'stocks',
    label: `${THEME_LABEL_MAP.stocks || '주식정보'} 테마`,
    description: '주식정보 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.stocks.overview.title',
        label: '개요 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.overview.title
      },
      {
        path: 'themes.stocks.marketSummary.title',
        label: '시장 요약 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.marketSummary.title
      },
      {
        path: 'themes.stocks.sectorHighlights.title',
        label: '섹터 하이라이트 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.sectorHighlights.title
      },
      {
        path: 'themes.stocks.sectorHighlights.badge',
        label: '섹터 하이라이트 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.sectorHighlights.badge
      },
      {
        path: 'themes.stocks.companyAnalyses.title',
        label: '기업 분석 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.companyAnalyses.title
      },
      {
        path: 'themes.stocks.companyAnalyses.badge',
        label: '기업 분석 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.companyAnalyses.badge
      },
      {
        path: 'themes.stocks.watchlist.title',
        label: '워치리스트 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.watchlist.title
      },
      {
        path: 'themes.stocks.watchlist.badge',
        label: '워치리스트 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.stocks.watchlist.badge
      }
    ]
  },
  {
    id: 'support',
    label: `${THEME_LABEL_MAP.support || '정부지원정보'} 테마`,
    description: '정부지원정보 테마 전용 카드 제목과 배지 문구입니다.',
    fields: [
      {
        path: 'themes.support.overview.title',
        label: '개요 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.support.overview.title
      },
      {
        path: 'themes.support.programs.fallbackTitle',
        label: '지원 프로그램 기본 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.support.programs.fallbackTitle
      },
      {
        path: 'themes.support.programs.badge',
        label: '지원 프로그램 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.support.programs.badge
      },
      {
        path: 'themes.support.commonResources.title',
        label: '공통 참고자료 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.support.commonResources.title
      },
      {
        path: 'themes.support.commonResources.badge',
        label: '공통 참고자료 배지',
        placeholder: DEFAULT_SECTION_TITLES.themes.support.commonResources.badge
      }
    ]
  },
  {
    id: 'groupbuy',
    label: `${THEME_LABEL_MAP.groupbuy || '공동구매정보'} 테마`,
    description: '공동구매 전용 링크 섹션 문구입니다.',
    fields: [
      {
        path: 'themes.groupbuy.linkSection.title',
        label: '링크 섹션 제목',
        placeholder: DEFAULT_SECTION_TITLES.themes.groupbuy.linkSection.title
      },
      {
        path: 'themes.groupbuy.linkSection.note',
        label: '링크 하단 안내 문구',
        placeholder: DEFAULT_SECTION_TITLES.themes.groupbuy.linkSection.note,
        multiline: true
      }
    ]
  }
];

function cloneDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneDeep(item));
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.keys(value).forEach((key) => {
      result[key] = cloneDeep(value[key]);
    });
    return result;
  }
  return value;
}

function applyOverrides(target, source) {
  if (!source || typeof source !== 'object') {
    return;
  }
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (sourceValue === undefined) {
      return;
    }
    if (Array.isArray(sourceValue)) {
      target[key] = cloneDeep(sourceValue);
      return;
    }
    if (sourceValue && typeof sourceValue === 'object') {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      applyOverrides(target[key], sourceValue);
      return;
    }
    target[key] = sourceValue;
  });
}

// Firestore에서 불러온 사용자 정의 값을 기본값과 병합한다.
export function mergeSectionTitles(overrides = {}) {
  const base = cloneDeep(DEFAULT_SECTION_TITLES);
  applyOverrides(base, overrides);
  return base;
}

function toPathArray(path) {
  if (Array.isArray(path)) {
    return path;
  }
  if (typeof path === 'string') {
    return path.split('.').filter(Boolean);
  }
  return [];
}

export function getValueFromPath(source, path) {
  const segments = toPathArray(path);
  if (segments.length === 0) {
    return undefined;
  }
  return segments.reduce((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }
    return undefined;
  }, source);
}

export function setValueAtPath(target, path, value) {
  const segments = toPathArray(path);
  if (segments.length === 0) {
    return target;
  }
  let cursor = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  });
  return target;
}

export function getDefaultSectionTitleValue(path) {
  const value = getValueFromPath(DEFAULT_SECTION_TITLES, path);
  return typeof value === 'string' ? value : '';
}

// 사용자 정의 값이 없거나 공백이라면 기본값을 반환한다.
export function getSectionTitleValue(sectionTitles, path) {
  const value = getValueFromPath(sectionTitles, path);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return getDefaultSectionTitleValue(path);
}
