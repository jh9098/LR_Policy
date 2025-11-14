import { DEFAULT_THEME_ID, THEME_CONFIG, isValidThemeId } from '../constants/themeConfig.js';
import { getDefaultCategory, isValidCategory, isValidSubcategory } from '../constants/categoryStructure.js';
import { ensureThemeGuides, getCurrentKoreanDateTimeString } from './emptyDraft.js';
import { loadDraftFromJson } from './loadDraftFromJson.js';

export function withDefaultDate(draft) {
  const dateValue = typeof draft?.date === 'string' ? draft.date.trim() : '';
  if (dateValue.length > 0) {
    return dateValue === draft.date ? draft : { ...draft, date: dateValue };
  }
  return { ...draft, date: getCurrentKoreanDateTimeString() };
}

export function sanitizeJsonNewlines(rawText) {
  if (typeof rawText !== 'string' || rawText.length === 0) {
    return rawText || '';
  }

  let sanitized = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (escaped) {
      sanitized += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      sanitized += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      sanitized += char;
      continue;
    }

    if (inString && (char === '\n' || char === '\r')) {
      continue;
    }

    sanitized += char;
  }

  return sanitized;
}

export function parseDraftFromJson(jsonText) {
  const parsed = loadDraftFromJson(jsonText);
  if (!isValidThemeId(parsed.theme)) {
    parsed.theme = DEFAULT_THEME_ID;
  }
  return ensureThemeGuides(parsed);
}

export function parseDraftStrict(jsonText) {
  const trimmed = typeof jsonText === 'string' ? jsonText.trim() : '';
  if (trimmed.length === 0) {
    throw new Error('JSON 문자열이 비어 있습니다.');
  }
  try {
    JSON.parse(trimmed);
  } catch (error) {
    throw new Error(error?.message ?? 'JSON 파싱에 실패했습니다.');
  }
  return withDefaultDate(parseDraftFromJson(trimmed));
}

export function splitJsonObjects(rawText) {
  const trimmed = typeof rawText === 'string' ? rawText.trim() : '';
  if (trimmed.length === 0) {
    return [];
  }

  const objects = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (depth === 0) {
        throw new Error('중괄호의 짝이 맞지 않습니다.');
      }
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        const slice = trimmed.slice(startIndex, index + 1).trim();
        if (slice.length > 0) {
          objects.push(slice);
        }
        startIndex = -1;
      }
    }
  }

  if (inString || depth !== 0) {
    throw new Error('JSON 문자열이 올바르게 닫히지 않았습니다.');
  }

  if (objects.length === 0) {
    throw new Error('JSON 객체를 찾을 수 없습니다. {"theme": ...} 형식인지 확인해 주세요.');
  }

  return objects;
}

export function normalizeCoreKeywords(rawKeywords) {
  if (!Array.isArray(rawKeywords)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const keyword of rawKeywords) {
    const text = typeof keyword === 'string' ? keyword.trim() : String(keyword ?? '').trim();
    if (text.length === 0 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

export function buildSubmissionPayload(draft) {
  const ensured = withDefaultDate(ensureThemeGuides(draft));
  const theme = isValidThemeId(ensured.theme) ? ensured.theme : DEFAULT_THEME_ID;
  const themeMeta = THEME_CONFIG.find((item) => item.id === theme) ?? THEME_CONFIG[0];
  const allowPerspectives = themeMeta?.showPerspectives ?? false;
  const category = isValidCategory(theme, ensured.category) ? ensured.category : getDefaultCategory(theme);
  const subcategory = isValidSubcategory(theme, category, ensured.subcategory) ? ensured.subcategory : '';
  const normalizedKeyPoints = Array.isArray(ensured.keyPoints)
    ? ensured.keyPoints.map((point) => (typeof point === 'string' ? point : String(point ?? '')))
    : [];
  const normalizedSources = Array.isArray(ensured.sources)
    ? ensured.sources.map((source) => ({
        type: typeof source?.type === 'string' ? source.type : 'official',
        channelName: typeof source?.channelName === 'string' ? source.channelName : '',
        sourceDate: typeof source?.sourceDate === 'string' ? source.sourceDate : '',
        timestamp: typeof source?.timestamp === 'string' ? source.timestamp : '',
        note: typeof source?.note === 'string' ? source.note : ''
      }))
    : [];
  const normalizedCoreKeywords = normalizeCoreKeywords(ensured.coreKeywords);
  const normalizedGroupbuyLink =
    typeof ensured.groupbuyLink === 'string' ? ensured.groupbuyLink.trim() : '';

  return {
    ...ensured,
    date: ensured.date,
    theme,
    category,
    subcategory,
    keyPoints: normalizedKeyPoints,
    sources: normalizedSources,
    coreKeywords: normalizedCoreKeywords,
    groupbuyLink: theme === 'groupbuy' ? normalizedGroupbuyLink : '',
    progressiveView: allowPerspectives ? ensured.progressiveView : null,
    conservativeView: allowPerspectives ? ensured.conservativeView : null,
    parentingGuide: theme === 'parenting' ? ensured.parentingGuide : null,
    healthGuide: theme === 'health' ? ensured.healthGuide : null,
    lifestyleGuide: theme === 'lifestyle' ? ensured.lifestyleGuide : null,
    stockGuide: theme === 'stocks' ? ensured.stockGuide : null,
    aiGuide: theme === 'ai' ? ensured.aiGuide : null,
    supportGuide: theme === 'support' ? ensured.supportGuide : null
  };
}

export function stringifyDraftForClipboard(draft) {
  return JSON.stringify(buildSubmissionPayload(draft));
}
