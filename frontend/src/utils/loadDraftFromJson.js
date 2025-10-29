// frontend/src/utils/loadDraftFromJson.js
// 운영자가 AI가 제공한 JSON 문자열을 붙여넣으면 issueDraft 구조체로 변환한다.
// 파싱에 실패하면 호출자에게 오류를 던져 상단 경고 문구로 표시한다.
import { emptyDraft } from './emptyDraft.js';

const CATEGORY_OPTIONS = new Set(['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타']);

const SOURCE_TYPE_OPTIONS = new Set(['official', 'youtube', 'media', 'etc']);

function cloneEmptyDraft() {
  return {
    title: emptyDraft.title,
    date: emptyDraft.date,
    category: emptyDraft.category,
    summaryCard: emptyDraft.summaryCard,
    background: emptyDraft.background,
    keyPoints: [],
    progressiveView: null,
    conservativeView: null,
    impactToLife: null,
    sources: []
  };
}

function toSafeString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => toSafeString(item));
}

function toSourceArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((source) => ({
    type: SOURCE_TYPE_OPTIONS.has(source?.type) ? source.type : 'etc',
    channelName: toSafeString(source?.channelName),
    sourceDate: toSafeString(source?.sourceDate),
    timestamp: toSafeString(source?.timestamp),
    note: toSafeString(source?.note)
  }));
}

function toPerspective(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      headline: '',
      bullets: [],
      intensity: -1,
      note: ''
    };
  }
  const intensityRaw = value.intensity;
  let intensity = -1;
  if (typeof intensityRaw === 'number' && Number.isFinite(intensityRaw)) {
    intensity = Math.max(-1, Math.min(100, Math.round(intensityRaw)));
  }
  if (typeof intensityRaw === 'string' && intensityRaw.trim() !== '') {
    const numeric = Number(intensityRaw);
    if (Number.isFinite(numeric)) {
      intensity = Math.max(-1, Math.min(100, Math.round(numeric)));
    }
  }
  return {
    headline: toSafeString(value.headline),
    bullets: toStringArray(value.bullets),
    intensity,
    note: toSafeString(value.note)
  };
}

function toImpact(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      text: '',
      note: ''
    };
  }
  return {
    text: toSafeString(value.text),
    note: toSafeString(value.note)
  };
}

export function loadDraftFromJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('JSON 문자열을 입력해 주세요.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(error.message);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('최상위 데이터는 객체(JSON object)여야 합니다.');
  }

  const draft = cloneEmptyDraft();

  draft.title = toSafeString(parsed.title ?? draft.title);
  draft.date = toSafeString(parsed.date ?? draft.date);
  draft.category = CATEGORY_OPTIONS.has(parsed.category) ? parsed.category : draft.category;
  draft.summaryCard = toSafeString(parsed.summaryCard ?? draft.summaryCard);
  draft.background = toSafeString(parsed.background ?? draft.background);
  draft.keyPoints = toStringArray(parsed.keyPoints);
  draft.sources = toSourceArray(parsed.sources);

  draft.progressiveView =
    parsed.progressiveView === undefined ? null : toPerspective(parsed.progressiveView);
  draft.conservativeView =
    parsed.conservativeView === undefined ? null : toPerspective(parsed.conservativeView);
  draft.impactToLife = parsed.impactToLife === undefined ? null : toImpact(parsed.impactToLife);

  return draft;
}
