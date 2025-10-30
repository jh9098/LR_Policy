// frontend/src/utils/loadDraftFromJson.js
// 상단 textarea에 붙여넣은 JSON 문자열을 issueDraft 구조에 맞게 파싱한다.
// 파싱 실패 시 예외를 던져서 AdminNewPage.jsx에서 빨간 경고를 표시하게 한다.
import { isValidCategory, isValidSubcategory } from '../constants/categoryStructure.js';
import { getThemeById, isValidThemeId } from '../constants/themeConfig.js';
import { createEmptyDraft, ensureThemeGuides } from './emptyDraft.js';
import {
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeParentingGuide
} from './themeDraftDefaults.js';

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toStringArray(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => toSafeString(item, ''));
}

function normalizePerspective(rawView) {
  if (!rawView || typeof rawView !== 'object') {
    return null;
  }
  return {
    headline: toSafeString(rawView.headline, ''),
    bullets: toStringArray(rawView.bullets ?? []),
    intensity: typeof rawView.intensity === 'number' ? rawView.intensity : -1,
    note: toSafeString(rawView.note, '')
  };
}

function normalizeImpact(rawImpact) {
  if (!rawImpact || typeof rawImpact !== 'object') {
    return null;
  }
  return {
    text: toSafeString(rawImpact.text, ''),
    note: toSafeString(rawImpact.note, '')
  };
}

function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }
  return rawSources.map((source) => ({
    type: toSafeString(source?.type, 'etc'),
    channelName: toSafeString(source?.channelName, ''),
    sourceDate: toSafeString(source?.sourceDate, ''),
    timestamp: toSafeString(source?.timestamp, ''),
    note: toSafeString(source?.note, '')
  }));
}

export function loadDraftFromJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('JSON 문자열이 비어 있습니다.');
  }

  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('issueDraft JSON은 객체 구조여야 합니다.');
  }

  const merged = ensureThemeGuides({
    ...createEmptyDraft(),
    ...parsed
  });

  merged.theme = isValidThemeId(parsed.theme) ? parsed.theme : getThemeById(parsed.theme)?.id;
  merged.easySummary = toSafeString(parsed.easySummary, '');
  merged.title = toSafeString(parsed.title, '');
  merged.date = toSafeString(parsed.date, '');
  const candidateCategory = toSafeString(parsed.category, '기타');
  merged.category = isValidCategory(candidateCategory) ? candidateCategory : '기타';
  const candidateSubcategory = toSafeString(parsed.subcategory, '');
  merged.subcategory = isValidSubcategory(merged.category, candidateSubcategory) ? candidateSubcategory : '';
  merged.summaryCard = toSafeString(parsed.summaryCard, '');
  merged.background = toSafeString(parsed.background, '');
  merged.keyPoints = toStringArray(parsed.keyPoints ?? []);
  merged.sources = normalizeSources(parsed.sources ?? []);
  merged.progressiveView =
    parsed.progressiveView === undefined ? null : normalizePerspective(parsed.progressiveView);
  merged.conservativeView =
    parsed.conservativeView === undefined ? null : normalizePerspective(parsed.conservativeView);
  merged.impactToLife =
    parsed.impactToLife === undefined ? null : normalizeImpact(parsed.impactToLife);
  merged.parentingGuide = normalizeParentingGuide(parsed.parentingGuide ?? merged.parentingGuide, { withPresets: true });
  merged.healthGuide = normalizeHealthGuide(parsed.healthGuide ?? merged.healthGuide, { withPresets: true });
  merged.lifestyleGuide = normalizeLifestyleGuide(parsed.lifestyleGuide ?? merged.lifestyleGuide);

  return merged;
}
