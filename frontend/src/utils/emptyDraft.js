// frontend/src/utils/emptyDraft.js
import { DEFAULT_THEME_ID } from '../constants/themeConfig.js';
import { getDefaultCategory } from '../constants/categoryStructure.js';
import {
  createEmptyThemeSections,
  createHealthGuide,
  createLifestyleGuide,
  createParentingGuide,
  createStockGuide,
  createSupportGuide
} from './themeDraftDefaults.js';

export function createEmptyDraft() {
  const { parentingGuide, healthGuide, lifestyleGuide, stockGuide, supportGuide } = createEmptyThemeSections();
  return {
    theme: DEFAULT_THEME_ID,
    easySummary: '',
    title: '',
    date: '',
    groupbuyLink: '',
    category: getDefaultCategory(DEFAULT_THEME_ID),
    subcategory: '',
    summaryCard: '',
    background: '',
    keyPoints: [],
    coreKeywords: [],
    progressiveView: null,
    conservativeView: null,
    impactToLife: null,
    sources: [],
    parentingGuide,
    healthGuide,
    lifestyleGuide,
    stockGuide,
    supportGuide // ✅ 추가
  };
}

export const emptyDraft = createEmptyDraft();

export function getCurrentKoreanDateTimeString() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23' // ← 24시간제로 강제
    });

    const parts = formatter.formatToParts(now).reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    const year = parts.year ?? '0000';
    const month = parts.month ?? '00';
    const day = parts.day ?? '00';
    const hour = (parts.hour ?? '00').padStart(2, '0');
    const minute = (parts.minute ?? '00').padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch (error) {
    console.warn('한국 시간 문자열 생성 실패, UTC 기준으로 대체합니다:', error);
    const fallback = new Date().toISOString(); // 2025-11-07T00:12:34.000Z
    // ISO는 UTC라서 일단 자르고 공백으로 바꿔서 시:분까지만
    return fallback.replace('T', ' ').slice(0, 16);
  }
}

export function createFreshDraft() {
  const draft = createEmptyDraft();
  return {
    ...draft,
    date: getCurrentKoreanDateTimeString(),
    groupbuyLink: draft.groupbuyLink,
    keyPoints: [...draft.keyPoints],
    sources: [...draft.sources],
    coreKeywords: [...draft.coreKeywords]
  };
}

export function ensureThemeGuides(draft) {
  return {
    ...draft,
    parentingGuide: draft?.parentingGuide ?? createParentingGuide(),
    healthGuide: draft?.healthGuide ?? createHealthGuide(),
    lifestyleGuide: draft?.lifestyleGuide ?? createLifestyleGuide(),
    stockGuide: draft?.stockGuide ?? createStockGuide(),
    supportGuide: draft?.supportGuide ?? createSupportGuide() // ✅ 추가
  };
}
