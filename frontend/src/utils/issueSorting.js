// frontend/src/utils/issueSorting.js
// 게시물 날짜 문자열을 일관된 값으로 변환하고 정렬하는 헬퍼입니다.

function extractDateParts(raw) {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

export function toIssueDateValue(raw) {
  const parts = extractDateParts(raw);
  if (parts) {
    const { year, month, day } = parts;
    const timestamp = Date.UTC(year, month - 1, day);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  const parsed = Date.parse(typeof raw === 'string' ? raw : '');
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return Number.NEGATIVE_INFINITY;
}

export function sortIssuesByDate(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return [...items].sort((a, b) => {
    const valueB = toIssueDateValue(b?.date);
    const valueA = toIssueDateValue(a?.date);

    if (valueB === valueA) {
      return (b?.title || '').localeCompare(a?.title || '');
    }

    return valueB - valueA;
  });
}
