// frontend/src/utils/themeDraftDefaults.js
// 테마별 초안/정규화/클론 유틸(생활/육아/건강/주식/정부지원)
// - Lifestyle: createLifestyleItem, createHotItem(호환), createHotDeal, affiliateNotes
// - Parenting: PARENTING_* 프리셋 + createParentingAgeGroup
// - Health: HEALTH_* 프리셋 + createHealthCondition
// - Stocks: STOCK_SECTOR_PRESETS + createSectorHighlight/createCompanyAnalysis/createWatchItem
// - Support: regionalNotes/faq 제거, commonResources 정착 (+ 프리셋 상수)

//////////////////////////////
// 공통 유틸
//////////////////////////////
export function toStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  return String(value).split(/\n+/).map((s) => s.trim()).filter(Boolean);
}
// ✅ null/undefined를 안전하게 객체로
export function asObject(v, fallback = {}) {
  return v && typeof v === 'object' ? v : fallback;
}

//////////////////////////////
// Lifestyle (생활정보)
//////////////////////////////

export function createLifestyleItem(name = '', category = '', highlight = '', link = '') {
  return { name: String(name ?? ''), category: String(category ?? ''), highlight: String(highlight ?? ''), link: String(link ?? '') };
}
export function createHotItem(name = '', highlight = '', link = '') {
  return createLifestyleItem(name, '', highlight, link);
}
export function createHotDeal(title = '', category = '', description = '', link = '', priceInfo = '', couponCode = '', expiresAt = '') {
  return { title: String(title ?? ''), category: String(category ?? ''), description: String(description ?? ''), link: String(link ?? ''), priceInfo: String(priceInfo ?? ''), couponCode: String(couponCode ?? ''), expiresAt: String(expiresAt ?? '') };
}
export function createLifestyleGuide() {
  return { overview: '', quickTips: [], hotItems: [], hotDeals: [], affiliateNotes: [] };
}
export function normalizeLifestyleGuide(raw = {}) {
  const r = asObject(raw, {});
  return {
    overview: String(r.overview ?? ''),
    quickTips: toStringArray(r.quickTips),
    hotItems: Array.isArray(r.hotItems) ? r.hotItems.map((x) => ({
      name: String(x?.name ?? ''), category: String(x?.category ?? ''), highlight: String(x?.highlight ?? ''), link: String(x?.link ?? '')
    })) : [],
    hotDeals: Array.isArray(r.hotDeals) ? r.hotDeals.map((x) => ({
      title: String(x?.title ?? ''), category: String(x?.category ?? ''), description: String(x?.description ?? ''), link: String(x?.link ?? ''), priceInfo: String(x?.priceInfo ?? ''), couponCode: String(x?.couponCode ?? ''), expiresAt: String(x?.expiresAt ?? '')
    })) : [],
    affiliateNotes: toStringArray(r.affiliateNotes)
  };
}
export function cloneLifestyleGuide(raw = {}) { return normalizeLifestyleGuide(raw); }

//////////////////////////////
// Parenting (육아정보)
//////////////////////////////

export const PARENTING_AGE_GROUP_PRESETS = [
  { ageRange: '0–6개월',  focusSummary: '수면 리듬 형성 · 기초 감각자극', developmentFocus: ['수유 후 트림/복부마사지', '고대조/모빌 시각자극'], careTips: ['과자/물 조기급여 금지', '안전한 배밀이 유도'], resources: [] },
  { ageRange: '6–12개월', focusSummary: '이유식 단계 · 대/소근육 기초',   developmentFocus: ['엎드려 놀기/잡고 서기', '옹알이 상호작용'],          careTips: ['규칙적 낮잠/수면 루틴', '질감 다양한 이유식'], resources: [] },
  { ageRange: '12–24개월',focusSummary: '자율성 · 언어/모방놀이',         developmentFocus: ['낙서/쌓기/끼우기', '간단한 지시 이해'],              careTips: ['일관된 경계/칭찬', '편식 방지 식단'], resources: [] },
  { ageRange: '24–36개월',focusSummary: '감정코칭 · 배변훈련 시작',        developmentFocus: ['역할놀이/상상놀이', '두 줄 문장 시작'],              careTips: ['스크린 타임 제한', '충분한 바깥놀이'], resources: [] }
];
export const PARENTING_GENERAL_TIPS_PRESETS = [
  '매일 같은 시간대 수면/기상 루틴 유지',
  '과자/주스/우유 과다 섭취 지양',
  '외출 전 기온 맞춘 레이어링',
  '짧고 자주 놀이(과자 대신 놀이로 집중 전환)'
];
export const PARENTING_EMERGENCY_CONTACTS_PRESETS = [
  '응급의료 119','야간 소아과/응급실 안내','지역 보건소/육아종합지원센터'
];
export function createParentingAgeGroup({ ageRange = '', focusSummary = '', developmentFocus = [], careTips = [], resources = [] } = {}) {
  return { ageRange: String(ageRange ?? ''), focusSummary: String(focusSummary ?? ''), developmentFocus: toStringArray(developmentFocus), careTips: toStringArray(careTips), resources: toStringArray(resources) };
}
export function createParentingGuide({ withPresets = true } = {}) {
  return {
    overview: '',
    generalTips: withPresets ? [...PARENTING_GENERAL_TIPS_PRESETS] : [],
    ageGroups: withPresets ? [createParentingAgeGroup(PARENTING_AGE_GROUP_PRESETS[0])] : [],
    emergencyContacts: withPresets ? [...PARENTING_EMERGENCY_CONTACTS_PRESETS] : []
  };
}
export function normalizeParentingGuide(raw = {}, { withPresets = false } = {}) {
  const base = createParentingGuide({ withPresets });
  const r = asObject(raw, {});
  return {
    overview: String(r.overview ?? ''),
    generalTips: toStringArray(r.generalTips ?? base.generalTips),
    ageGroups: Array.isArray(r.ageGroups) ? r.ageGroups.map((g) => createParentingAgeGroup({
      ageRange: g?.ageRange, focusSummary: g?.focusSummary, developmentFocus: g?.developmentFocus, careTips: g?.careTips, resources: g?.resources
    })) : base.ageGroups,
    emergencyContacts: toStringArray(r.emergencyContacts ?? base.emergencyContacts)
  };
}
export function cloneParentingGuide(raw = {}, opts) { return normalizeParentingGuide(raw, opts); }

//////////////////////////////
// Health (건강정보)
//////////////////////////////

export const HEALTH_LIFESTYLE_TIPS_PRESETS = [
  '하루 30분 이상 걷기/가벼운 유산소',
  '채소·단백질 위주 식사, 가공당 줄이기',
  '수면 7–8시간, 취침 전 스크린 절제',
  '흡연·과음 줄이기'
];
export const HEALTH_EMERGENCY_GUIDE_PRESETS = [
  '심한 흉통/호흡곤란/의식저하 시 즉시 119',
  '한쪽 마비/언어장애/시야 이상 발생 시 즉시 응급실(뇌졸중 의심)',
  '혈변·토혈 등 대량 출혈 시 즉시 내원'
];
export const HEALTH_CONDITION_PRESETS = [
  { name: '요통/디스크', summary: '간헐적 요통·엉치/다리 저림이 동반될 수 있음', warningSigns: ['하지 마비/근력저하','대소변 장애','발열 동반 심한 통증'], careTips: ['급성 48시간 냉찜질 후 온찜질 전환','무게 드는 동작 피하기','통증 심하면 진료'], resources: [] },
  { name: '상기도감염(감기)', summary: '대부분 바이러스성, 휴식/수분섭취/대증요법이 기본', warningSigns: ['고열 지속 3일 이상','호흡곤란/흉통','탈수 징후'], careTips: ['수분·해열·휴식','손 위생/마스크','영아/고위험군은 조기 진료'], resources: [] }
];
export function createHealthCondition({ name = '', summary = '', warningSigns = [], careTips = [], resources = [] } = {}) {
  return { name: String(name ?? ''), summary: String(summary ?? ''), warningSigns: toStringArray(warningSigns), careTips: toStringArray(careTips), resources: toStringArray(resources) };
}
export function createHealthGuide({ withPresets = true } = {}) {
  return { overview: '', lifestyleTips: withPresets ? [...HEALTH_LIFESTYLE_TIPS_PRESETS.slice(0,2)] : [], conditions: [], emergencyGuide: withPresets ? [...HEALTH_EMERGENCY_GUIDE_PRESETS] : [] };
}
export function normalizeHealthGuide(raw = {}, { withPresets = false } = {}) {
  const base = createHealthGuide({ withPresets });
  const r = asObject(raw, {});
  return {
    overview: String(r.overview ?? ''),
    lifestyleTips: toStringArray(r.lifestyleTips ?? base.lifestyleTips),
    conditions: Array.isArray(r.conditions) ? r.conditions.map((c) => createHealthCondition({
      name: c?.name, summary: c?.summary, warningSigns: c?.warningSigns, careTips: c?.careTips, resources: c?.resources
    })) : base.conditions,
    emergencyGuide: toStringArray(r.emergencyGuide ?? base.emergencyGuide)
  };
}
export function cloneHealthGuide(raw = {}, opts) { return normalizeHealthGuide(raw, opts); }

//////////////////////////////
// Stocks (주식정보)
//////////////////////////////

export const STOCK_SECTOR_PRESETS = [
  { name: '반도체', outlook: '메모리 가격 회복·AI 서버 수요 확대', leaders: ['삼성전자','SK하이닉스'] },
  { name: '2차전지', outlook: '중국 공급과잉 변수, 선별적 접근', leaders: ['LG에너지솔루션','에코프로'] },
  { name: '로봇', outlook: '산업/서비스 로봇 수요 확대, 정책 모멘텀', leaders: ['두산로보틱스','포스코DX'] }
];
export function createSectorHighlight(name = '', outlook = '', leaders = []) {
  return { name: String(name ?? ''), outlook: String(outlook ?? ''), leaders: toStringArray(leaders) };
}
export function createCompanyAnalysis(name = '', thesis = '', catalysts = [], risks = [], valuation = '') {
  return { name: String(name ?? ''), thesis: String(thesis ?? ''), catalysts: toStringArray(catalysts), risks: toStringArray(risks), valuation: String(valuation ?? '') };
}
export function createWatchItem(symbol = '', note = '') { return { symbol: String(symbol ?? ''), note: String(note ?? '') }; }
export function createStockGuide() {
  return { overview: '', marketSummary: '', sectorHighlights: [], companyAnalyses: [], watchlist: [] };
}
export function normalizeStockGuide(raw = {}) {
  const r = asObject(raw, {});
  const normalizeWatch = (arr) => {
    if (!Array.isArray(arr)) return [];
    const hasObject = arr.some((x) => x && typeof x === 'object');
    if (hasObject) {
      return arr.map((w) => ({ symbol: String(w?.symbol ?? ''), note: String(w?.note ?? '') })).filter((w) => w.symbol);
    }
    return toStringArray(arr);
  };
  return {
    overview: String(r.overview ?? ''),
    marketSummary: String(r.marketSummary ?? ''),
    sectorHighlights: Array.isArray(r.sectorHighlights) ? r.sectorHighlights.map((s) =>
      createSectorHighlight(s?.name, s?.outlook, s?.leaders ?? s?.stocks ?? [])
    ) : [],
    companyAnalyses: Array.isArray(r.companyAnalyses) ? r.companyAnalyses.map((c) =>
      createCompanyAnalysis(c?.name, c?.thesis, c?.catalysts, c?.risks, c?.valuation)
    ) : [],
    watchlist: normalizeWatch(r.watchlist)
  };
}
export function cloneStockGuide(raw = {}) { return normalizeStockGuide(raw); }

//////////////////////////////
// Support (정부지원)
//////////////////////////////

export const SUPPORT_COMMON_RESOURCES_PRESETS = [
  '정부24 https://www.gov.kr',
  '복지로 https://www.bokjiro.go.kr',
  '보건복지 상담 129'
];
export function createSupportProgram(name = '') {
  return { name, summary: '', eligibility: [], benefits: [], requiredDocs: [], applicationProcess: [] };
}
export function createSupportGuide({ withPresets = true } = {}) {
  return { overview: '', programs: withPresets ? [createSupportProgram('대표 지원 프로그램')] : [], commonResources: withPresets ? [...SUPPORT_COMMON_RESOURCES_PRESETS] : [] };
}
export function normalizeSupportGuide(raw = {}, { withPresets = false } = {}) {
  const base = createSupportGuide({ withPresets });
  const r = asObject(raw, {});
  return {
    overview: String(r.overview ?? ''),
    programs: Array.isArray(r.programs) ? r.programs.map((p) => ({
      name: String(p?.name ?? ''), summary: String(p?.summary ?? ''), eligibility: toStringArray(p?.eligibility), benefits: toStringArray(p?.benefits), requiredDocs: toStringArray(p?.requiredDocs), applicationProcess: toStringArray(p?.applicationProcess)
    })) : base.programs,
    commonResources: toStringArray(r.commonResources ?? base.commonResources)
  };
}
export function cloneSupportGuide(raw = {}, opts) { return normalizeSupportGuide(raw, opts); }

//////////////////////////////
// 묶음: 빈 섹션 일괄 생성
//////////////////////////////
export function createEmptyThemeSections() {
  return {
    parentingGuide: createParentingGuide(),
    healthGuide: createHealthGuide(),
    lifestyleGuide: createLifestyleGuide(),
    stockGuide: createStockGuide(),
    supportGuide: createSupportGuide()
  };
}
