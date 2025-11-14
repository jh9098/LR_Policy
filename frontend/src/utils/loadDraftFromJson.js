// frontend/src/utils/loadDraftFromJson.js
import { isValidThemeId } from '../constants/themeConfig.js';
import { createEmptyDraft } from './emptyDraft.js';
import {
  normalizeAiGuide,
  normalizeParentingGuide,
  normalizeHealthGuide,
  normalizeLifestyleGuide,
  normalizeSupportGuide
} from './themeDraftDefaults.js';

export function loadDraftFromJson(jsonText) {
  let parsed = {};
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = {};
  }

  const themeId = isValidThemeId(parsed?.theme) ? parsed.theme : createEmptyDraft().theme;
  const merged = { ...parsed, theme: themeId };

  if (themeId === 'ai') {
    merged.aiGuide = normalizeAiGuide(parsed.aiGuide ?? {});
  } else if (themeId === 'parenting') {
    merged.parentingGuide = normalizeParentingGuide(parsed.parentingGuide ?? {}, { withPresets: true });
  } else if (themeId === 'health') {
    merged.healthGuide = normalizeHealthGuide(parsed.healthGuide ?? {}, { withPresets: true });
  } else if (themeId === 'lifestyle') {
    merged.lifestyleGuide = normalizeLifestyleGuide(parsed.lifestyleGuide ?? {});
  } else if (themeId === 'support') {
    // ✅ 정부지원 테마 정규화
    merged.supportGuide = normalizeSupportGuide(parsed.supportGuide ?? {}, { withPresets: true });
  }

  return merged;
}
