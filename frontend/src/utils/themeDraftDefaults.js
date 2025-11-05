// frontend/src/utils/themeDraftDefaults.js
// 테마별 draft 구조의 기본 템플릿과 정규화 유틸리티를 제공한다.
// AdminNewPage, AdminEditPage, Firestore 정규화 로직이 공통으로 사용한다.

const toStringArray = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item === null || item === undefined) return '';
      try {
        return String(item);
      } catch {
        return '';
      }
    })
    // 🔧 기존 trimStart() → trim()으로 변경 (양끝 공백 제거)
    .map((item) => item.trim())
    // 완전 빈 문자열 제거
    .filter((item) => item.length > 0);
};

export const PARENTING_AGE_GROUP_PRESETS = [
  '임신/출산 준비',
  '0~6개월 영아',
  '7~12개월 영아',
  '13~24개월 걸음마기',
  '3~5세 유아',
  '6세 이상 학령기'
];

export function createParentingAgeGroup(ageRange = '') {
  return {
    ageRange,
    focusSummary: '',
    developmentFocus: [],
    careTips: [],
    resources: []
  };
}

export function normalizeParentingAgeGroup(raw) {
  const base = createParentingAgeGroup();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ageRange: typeof raw.ageRange === 'string' ? raw.ageRange.trim() : base.ageRange,
    focusSummary: typeof raw.focusSummary === 'string' ? raw.focusSummary.trim() : base.focusSummary,
    developmentFocus: toStringArray(raw.developmentFocus),
    careTips: toStringArray(raw.careTips),
    resources: toStringArray(raw.resources)
  };
}

export function createParentingGuide({ withPresets = true } = {}) {
  const ageGroups = withPresets
    ? PARENTING_AGE_GROUP_PRESETS.map((label) => createParentingAgeGroup(label))
    : [];
  return {
    overview: '',
    ageGroups,
    generalTips: [],
    emergencyContacts: []
  };
}

export function normalizeParentingGuide(raw, { withPresets = true } = {}) {
  const base = createParentingGuide({ withPresets });
  if (!raw || typeof raw !== 'object') return base;
  const ageGroups =
    Array.isArray(raw.ageGroups) && raw.ageGroups.length > 0
      ? raw.ageGroups.map((item) => normalizeParentingAgeGroup(item))
      : base.ageGroups;
  return {
    overview: typeof raw.overview === 'string' ? raw.overview.trim() : base.overview,
    ageGroups,
    generalTips: toStringArray(raw.generalTips),
    emergencyContacts: toStringArray(raw.emergencyContacts)
  };
}

export function cloneParentingGuide(raw) {
  return normalizeParentingGuide(raw, { withPresets: false });
}

export const HEALTH_CONDITION_PRESETS = [
  '치매',
  '자폐 스펙트럼',
  'ADHD',
  '우울/불안',
  '허리 통증',
  '심혈관 질환'
];

export function createHealthCondition(name = '') {
  return {
    name,
    summary: '',
    warningSigns: [],
    careTips: [],
    resources: []
  };
}

export function normalizeHealthCondition(raw) {
  const base = createHealthCondition();
  if (!raw || typeof raw !== 'object') return base;
  return {
    name: typeof raw.name === 'string' ? raw.name.trim() : base.name,
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : base.summary,
    warningSigns: toStringArray(raw.warningSigns),
    careTips: toStringArray(raw.careTips),
    resources: toStringArray(raw.resources)
  };
}

export function createHealthGuide({ withPresets = true } = {}) {
  const conditions = withPresets ? HEALTH_CONDITION_PRESETS.map((n) => createHealthCondition(n)) : [];
  return {
    overview: '',
    conditions,
    lifestyleTips: [],
    emergencyGuide: []
  };
}

export function normalizeHealthGuide(raw, { withPresets = true } = {}) {
  const base = createHealthGuide({ withPresets });
  if (!raw || typeof raw !== 'object') return base;
  const conditions =
    Array.isArray(raw.conditions) && raw.conditions.length > 0
      ? raw.conditions.map((item) => normalizeHealthCondition(item))
      : base.conditions;
  return {
    overview: typeof raw.overview === 'string' ? raw.overview.trim() : base.overview,
    conditions,
    lifestyleTips: toStringArray(raw.lifestyleTips),
    emergencyGuide: toStringArray(raw.emergencyGuide)
  };
}

export function cloneHealthGuide(raw) {
  return normalizeHealthGuide(raw, { withPresets: false });
}

export function createLifestyleItem(name = '') {
  return { name, highlight: '', link: '' };
}
export function createHotDeal(title = '') {
  return { title, description: '', link: '', priceInfo: '' };
}

export function createLifestyleGuide() {
  return {
    overview: '',
    quickTips: [],
    hotItems: [],
    hotDeals: [],
    affiliateNotes: []
  };
}

export function normalizeLifestyleGuide(raw) {
  const base = createLifestyleGuide();
  if (!raw || typeof raw !== 'object') return base;
  return {
    overview: typeof raw.overview === 'string' ? raw.overview.trim() : base.overview,
    quickTips: toStringArray(raw.quickTips),
    hotItems: Array.isArray(raw.hotItems)
      ? raw.hotItems
          .map((item) => ({
            name: typeof item?.name === 'string' ? item.name.trim() : '',
            highlight: typeof item?.highlight === 'string' ? item.highlight.trim() : '',
            link: typeof item?.link === 'string' ? item.link.trim() : ''
          }))
          .filter((x) => x.name || x.highlight || x.link)
      : base.hotItems,
    hotDeals: Array.isArray(raw.hotDeals)
      ? raw.hotDeals
          .map((deal) => ({
            title: typeof deal?.title === 'string' ? deal.title.trim() : '',
            description: typeof deal?.description === 'string' ? deal.description.trim() : '',
            link: typeof deal?.link === 'string' ? deal.link.trim() : '',
            priceInfo: typeof deal?.priceInfo === 'string' ? deal.priceInfo.trim() : ''
          }))
          .filter((x) => x.title || x.description || x.link || x.priceInfo)
      : base.hotDeals,
    affiliateNotes: toStringArray(raw.affiliateNotes)
  };
}

export function cloneLifestyleGuide(raw) {
  return normalizeLifestyleGuide(raw);
}

// ---- Stocks (주식정보) ----
export function createSectorHighlight(name = '') {
  return { name, outlook: '', leaders: [] };
}
export function createCompanyAnalysis(name = '') {
  return { name, thesis: '', catalysts: [], risks: [], valuation: '' };
}
export function createStockGuide() {
  return {
    overview: '',
    marketSummary: '',
    sectorHighlights: [],
    companyAnalyses: [],
    watchlist: []
  };
}
export function normalizeStockGuide(raw) {
  const base = createStockGuide();
  if (!raw || typeof raw !== 'object') return base;
  return {
    overview: typeof raw.overview === 'string' ? raw.overview.trim() : base.overview,
    marketSummary: typeof raw.marketSummary === 'string' ? raw.marketSummary.trim() : base.marketSummary,
    sectorHighlights: Array.isArray(raw.sectorHighlights)
      ? raw.sectorHighlights
          .map((s) => ({
            name: typeof s?.name === 'string' ? s.name.trim() : '',
            outlook: typeof s?.outlook === 'string' ? s.outlook.trim() : '',
            leaders: toStringArray(s?.leaders)
          }))
          .filter((x) => x.name || x.outlook || (x.leaders && x.leaders.length))
      : base.sectorHighlights,
    companyAnalyses: Array.isArray(raw.companyAnalyses)
      ? raw.companyAnalyses
          .map((c) => ({
            name: typeof c?.name === 'string' ? c.name.trim() : '',
            thesis: typeof c?.thesis === 'string' ? c.thesis.trim() : '',
            catalysts: toStringArray(c?.catalysts),
            risks: toStringArray(c?.risks),
            valuation: typeof c?.valuation === 'string' ? c.valuation.trim() : ''
          }))
          .filter((x) => x.name || x.thesis || x.valuation || (x.catalysts && x.catalysts.length) || (x.risks && x.risks.length))
      : base.companyAnalyses,
    watchlist: toStringArray(raw.watchlist)
  };
}
export function createEmptyThemeSections() {
  return {
    parentingGuide: createParentingGuide(),
    healthGuide: createHealthGuide(),
    lifestyleGuide: createLifestyleGuide(),
    stockGuide: createStockGuide()
  };
}
