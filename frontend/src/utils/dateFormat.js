// frontend/src/utils/dateFormat.js
// 한국 시간(Asia/Seoul) 기준의 날짜/시간 서식을 처리하는 헬퍼 함수 모음

function getSeoulFormatter() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
}

function extractParts(formatter, date) {
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
  return {
    year: parts.year ?? '0000',
    month: (parts.month ?? '00').padStart(2, '0'),
    day: (parts.day ?? '00').padStart(2, '0'),
    hour: (parts.hour ?? '00').padStart(2, '0'),
    minute: (parts.minute ?? '00').padStart(2, '0')
  };
}

export function formatKoreanDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const formatter = getSeoulFormatter();
  const { year, month, day, hour, minute } = extractParts(formatter, date);
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatDateTimeInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const formatter = getSeoulFormatter();
  const { year, month, day, hour, minute } = extractParts(formatter, date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseDateTimeInput(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(`${normalized}:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function addMinutes(date, minutes) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const result = new Date(date.getTime());
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}
