// frontend/src/utils/loadDraftFromJson.js
// 운영자가 AI가 제공한 JSON 문자열을 붙여넣으면 issueDraft 구조체로 변환한다.
// 파싱에 실패하면 호출자에게 오류를 던져 상단 경고 문구로 표시한다.
import { emptyDraft } from './emptyDraft.js';

const CATEGORY_OPTIONS = new Set(['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타']);

function toTrimmedString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function toStringArray(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => toTrimmedString(String(item ?? '')));
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseIntensity(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePerspective(rawView) {
  if (!rawView || typeof rawView !== 'object') {
    return undefined;
  }

  const headline = toTrimmedString(rawView.headline ?? '');
  const bullets = toStringArray(rawView.bullets ?? rawView.points);
  const note = typeof rawView.note === 'string' ? rawView.note : '';
  const intensity = parseIntensity(rawView.intensity);

  if (!headline && bullets.length === 0 && !note && intensity === undefined) {
    return undefined;
  }

  const normalized = { headline, bullets, note };
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }

  return normalized;
}

function normalizeImpact(rawImpact) {
  if (!rawImpact || typeof rawImpact !== 'object') {
    return undefined;
  }

  const text = toTrimmedString(rawImpact.text ?? '');
  const note = typeof rawImpact.note === 'string' ? rawImpact.note : '';

  if (!text && !note) {
    return undefined;
  }

  return { text, note };
}

function normalizeSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources.map((source) => {
    const timestampRaw = source?.timestamp;
    let timestamp = null;
    if (timestampRaw !== null && timestampRaw !== undefined && timestampRaw !== '') {
      timestamp = toTrimmedString(String(timestampRaw));
    }

    return {
      type: typeof source?.type === 'string' ? source.type : 'etc',
      channelName: toTrimmedString(source?.channelName ?? ''),
      sourceDate: toTrimmedString(source?.sourceDate ?? ''),
      timestamp,
      note: typeof source?.note === 'string' ? source.note : ''
    };
  });
}

export function loadDraftFromJson(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('JSON 문자열을 입력해 주세요.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error('JSON 파싱에 실패했습니다. 괄호나 따옴표를 다시 확인해 주세요.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('최상위 구조는 객체여야 합니다.');
  }

  const base = {
    ...emptyDraft,
    keyPoints: [...emptyDraft.keyPoints],
    sources: [...emptyDraft.sources]
  };

  const draft = {
    ...base,
    title: toTrimmedString(parsed.title ?? ''),
    date: toTrimmedString(parsed.date ?? ''),
    category: CATEGORY_OPTIONS.has(parsed.category) ? parsed.category : '기타',
    summaryCard: toTrimmedString(parsed.summaryCard ?? ''),
    background: toTrimmedString(parsed.background ?? ''),
    keyPoints: toStringArray(parsed.keyPoints),
    progressiveView: normalizePerspective(parsed.progressiveView),
    conservativeView: normalizePerspective(parsed.conservativeView),
    impactToLife: normalizeImpact(parsed.impactToLife),
    sources: normalizeSources(parsed.sources)
  };

  return draft;
}
