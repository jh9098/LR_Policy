// frontend/src/utils/emptyDraft.js
// issueDraft 최종 스키마(easySummary 포함)를 기본값으로 정의한다.
// AdminNewPage/AdminEditPage 전역에서 동일한 구조를 사용하며, localStorage('adminDraftV6') 백업 시에도 이 객체를 기준으로 직렬화한다.
// 주의: progressiveView / conservativeView / impactToLife 는 null일 수 있으며, 필요할 때만 추가 버튼으로 생성한다.

import { DEFAULT_THEME_ID } from '../constants/themeConfig.js';
import {
  createEmptyThemeSections,
  createHealthGuide,
  createLifestyleGuide,
  createParentingGuide
} from './themeDraftDefaults.js';

export function createEmptyDraft() {
  const { parentingGuide, healthGuide, lifestyleGuide } = createEmptyThemeSections();
  return {
    theme: DEFAULT_THEME_ID,
    easySummary: '',
    title: '',
    date: '',
    category: '기타',
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
    lifestyleGuide
  };
}

export const emptyDraft = createEmptyDraft();

export function createFreshDraft() {
  const draft = createEmptyDraft();
  return {
    ...draft,
    keyPoints: [...draft.keyPoints],
    sources: [...draft.sources]
  };
}

export function ensureThemeGuides(draft) {
  return {
    ...draft,
    parentingGuide: draft?.parentingGuide ?? createParentingGuide(),
    healthGuide: draft?.healthGuide ?? createHealthGuide(),
    lifestyleGuide: draft?.lifestyleGuide ?? createLifestyleGuide()
  };
}

// 참고: localStorage key는 항상 "adminDraftV6"를 사용한다. (AdminNewPage.jsx 참조)
