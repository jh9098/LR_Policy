// frontend/src/utils/loadDraftFromJson.js
// AI가 생성한 JSON 문자열을 받아 issueDraft 스키마에 맞게 병합하는 헬퍼다.
// 실패 시 예외를 throw해 AdminNewPage에서 오류 메시지를 표시하도록 한다.

import { emptyDraft } from './emptyDraft';

export const loadDraftFromJson = (rawText) => {
  if (!rawText) {
    throw new Error('JSON 문자열이 비어 있습니다.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error('JSON 파싱에 실패했습니다. 입력 형식을 다시 확인하세요.');
  }

  // 기본 스키마와 병합하여 누락 필드를 채워 넣는다.
  const draft = {
    ...emptyDraft,
    ...parsed,
  };

  // null 허용 필드가 undefined로 들어오는 경우가 있으므로 강제로 null 처리한다.
  draft.progressiveView = parsed.progressiveView ?? null;
  draft.conservativeView = parsed.conservativeView ?? null;
  draft.impactToLife = parsed.impactToLife ?? null;

  // 배열 필드는 안전하게 변환한다.
  draft.keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [];
  draft.sources = Array.isArray(parsed.sources) ? parsed.sources : [];

  // easySummary가 누락되면 빈 문자열로 채운다.
  draft.easySummary = typeof parsed.easySummary === 'string' ? parsed.easySummary : '';

  return draft;
};
