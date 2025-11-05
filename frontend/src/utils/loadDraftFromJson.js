// frontend/src/utils/loadDraftFromJson.js
// 상단 textarea에 붙여넣은 JSON 문자열을 issueDraft 구조에 맞게 파싱한다.
// 파싱 실패 시 예외를 던져서 AdminNewPage.jsx에서 빨간 경고를 표시하게 한다.

import { getDefaultCategory, isValidCategory, isValidSubcategory } from '../constants/categoryStructure.js';
import { getThemeById, isValidThemeId } from '../constants/themeConfig.js';
import { createEmptyDraft, ensureThemeGuides } from './emptyDraft.js';
import {
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeParentingGuide
} from './themeDraftDefaults.js';

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  try {
    return String(value);
  } catch {
    return fallback;
  }
}

function toStringArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => toSafeString(item, ''));
}

function normalizePerspective(rawView) {
  if (!rawView || typeof rawView !== 'object') return null;
  return {
    headline: toSafeString(rawView.headline, ''),
    bullets: toStringArray(rawView.bullets ?? []),
    intensity: typeof rawView.intensity === 'number' ? rawView.intensity : -1,
    note: toSafeString(rawView.note, '')
  };
}

function normalizeImpact(rawImpact) {
  if (!rawImpact || typeof rawImpact !== 'object') return null;
  return {
    text: toSafeString(rawImpact.text, ''),
    note: toSafeString(rawImpact.note, '')
  };
}

// 🔧 parseSources()와 일치: 빈 timestamp는 null 로 강제
function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) return [];
  return rawSources
    .map((source) => {
      const timestampRaw = toSafeString(source?.timestamp, '');
      return {
        type: toSafeString(source?.type, 'etc'),
        channelName: toSafeString(source?.channelName, ''),
        sourceDate: toSafeString(source?.sourceDate, ''),
        timestamp: timestampRaw.length ? timestampRaw : null,
        note: toSafeString(source?.note, '')
      };
    })
    .filter((s) => s.channelName); // 채널명이 비어 있으면 제거 (에디터 안정화)
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

  const themeMeta = getThemeById(parsed.theme);
  const fallbackThemeId = themeMeta?.id ?? getThemeById().id;
  const themeId = isValidThemeId(parsed.theme) ? parsed.theme : fallbackThemeId;
  merged.theme = themeId;
  merged.easySummary = toSafeString(parsed.easySummary, '');
  merged.title = toSafeString(parsed.title, '');
  merged.date = toSafeString(parsed.date, '');

  const defaultCategory = getDefaultCategory(themeId);
  const candidateCategory = toSafeString(parsed.category, defaultCategory);
  merged.category = isValidCategory(themeId, candidateCategory) ? candidateCategory : defaultCategory;

  const candidateSubcategory = toSafeString(parsed.subcategory, '');
  merged.subcategory = isValidSubcategory(themeId, merged.category, candidateSubcategory) ? candidateSubcategory : '';

  merged.summaryCard = toSafeString(parsed.summaryCard, '');
  merged.background = toSafeString(parsed.background, '');
  merged.keyPoints = toStringArray(parsed.keyPoints ?? []);

  merged.sources = normalizeSources(parsed.sources ?? []);

  merged.progressiveView = parsed.progressiveView === undefined ? null : normalizePerspective(parsed.progressiveView);
  merged.conservativeView = parsed.conservativeView === undefined ? null : normalizePerspective(parsed.conservativeView);
  merged.impactToLife = parsed.impactToLife === undefined ? null : normalizeImpact(parsed.impactToLife);

  // 테마별 가이드 정규화
  if (themeId === 'parenting') {
    merged.parentingGuide = normalizeParentingGuide(parsed.parentingGuide ?? {});
  } else if (themeId === 'health') {
    merged.healthGuide = normalizeHealthGuide(parsed.healthGuide ?? {});
  } else if (themeId === 'lifestyle') {
    merged.lifestyleGuide = normalizeLifestyleGuide(parsed.lifestyleGuide ?? {});
  }

  // 기타 필드 스키마 불일치 방지용
  return merged;
}
