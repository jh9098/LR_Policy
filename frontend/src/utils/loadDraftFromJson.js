// frontend/src/utils/loadDraftFromJson.js
// 운영자가 상단 textarea에 붙여넣은 JSON 문자열을 엄격하게 파싱해 issueDraft 상태로 변환한다.
// JSON.parse 단계에서 오류가 발생하면 예외를 그대로 던져 상단 UI에서 사용자에게 알려준다.
import { emptyDraft } from './emptyDraft.js';

const CATEGORY_OPTIONS = new Set(['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타']);
const SOURCE_TYPE_OPTIONS = new Set(['official', 'youtube', 'media', 'etc']);

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

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

function toSafeCategory(rawCategory) {
  if (typeof rawCategory !== 'string') {
    return '기타';
  }
  return CATEGORY_OPTIONS.has(rawCategory) ? rawCategory : '기타';
}

function toSafeSourceType(rawType) {
  if (typeof rawType !== 'string') {
    return 'etc';
  }
  return SOURCE_TYPE_OPTIONS.has(rawType) ? rawType : 'etc';
}

function toSafeIntensity(value) {
  if (value === null || value === undefined || value === '') {
    return -1;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return -1;
  }
  if (numeric === -1) {
    return -1;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePerspective(rawView, defaultNote) {
  if (!rawView || typeof rawView !== 'object') {
    return null;
  }

  return {
    headline: toSafeString(rawView.headline, ''),
    bullets: toStringArray(rawView.bullets ?? rawView.points ?? []),
    intensity: toSafeIntensity(rawView.intensity),
    note: toSafeString(rawView.note, defaultNote) || defaultNote
  };
}

function normalizeImpact(rawImpact) {
  if (!rawImpact || typeof rawImpact !== 'object') {
    return null;
  }

  return {
    text: toSafeString(rawImpact.text, ''),
    note: toSafeString(rawImpact.note, IMPACT_NOTE) || IMPACT_NOTE
  };
}

function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources.map((source) => ({
    type: toSafeSourceType(source?.type),
    channelName: toSafeString(source?.channelName, ''),
    sourceDate: toSafeString(source?.sourceDate, ''),
    timestamp: toSafeString(source?.timestamp, ''),
    note: toSafeString(source?.note, '')
  }));
}

export function loadDraftFromJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('JSON 문자열을 먼저 입력해 주세요.');
  }

  const parsed = JSON.parse(rawText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('issueDraft JSON은 객체 형태여야 합니다.');
  }

  const merged = {
    ...emptyDraft,
    ...parsed
  };

  merged.title = toSafeString(parsed.title, '');
  merged.date = toSafeString(parsed.date, '');
  merged.category = toSafeCategory(parsed.category);
  merged.summaryCard = toSafeString(parsed.summaryCard, '');
  merged.background = toSafeString(parsed.background, '');
  merged.keyPoints = toStringArray(parsed.keyPoints ?? []);
  merged.sources = normalizeSources(parsed.sources ?? []);

  merged.progressiveView =
    parsed.progressiveView === undefined
      ? null
      : normalizePerspective(parsed.progressiveView, PROGRESSIVE_NOTE);

  merged.conservativeView =
    parsed.conservativeView === undefined
      ? null
      : normalizePerspective(parsed.conservativeView, CONSERVATIVE_NOTE);

  merged.impactToLife =
    parsed.impactToLife === undefined ? null : normalizeImpact(parsed.impactToLife);

  return merged;
}
