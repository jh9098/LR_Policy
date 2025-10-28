// frontend/src/utils/parseSources.js
/**
 * textarea 입력값을 Firestore 저장용 출처 배열로 변환한다.
 * 각 줄은 "type|channelName|sourceDate|timestamp|note" 형식을 따른다.
 * timestamp가 비어 있으면 null 로 저장한다.
 */
export function parseSources(multilineText) {
  if (!multilineText || typeof multilineText !== 'string') {
    return [];
  }

  return multilineText
    .split(/\r?\n|\r|\u2028/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type = 'etc', channelName = '', sourceDate = '', timestamp = '', note = ''] = line
        .split('|')
        .map((part) => part.trim());

      if (!channelName) {
        return null;
      }

      return {
        type: type || 'etc',
        channelName,
        sourceDate,
        timestamp: timestamp || null,
        note
      };
    })
    .filter(Boolean);
}
