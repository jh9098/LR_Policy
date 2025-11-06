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
    category: getDefaultCategory(DEFAULT_THEME_ID),
    subcategory: '',
    summaryCard: '',
    background: '',
    keyPoints: [],
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

export function createFreshDraft() {
  const draft = createEmptyDraft();
  return { ...draft, keyPoints: [...draft.keyPoints], sources: [...draft.sources] };
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
