// frontend/src/utils/parseSources.js
/**
 * 멀티라인 텍스트를 Firestore에 저장 가능한 출처 객체 배열로 변환한다.
 * 각 줄은 "type|channelName|videoDate|timestamp|note" 형태를 기대한다.
 * 값이 부족하면 가능한 한 기본값을 채우고, 채널명이 없으면 해당 항목은 버린다.
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
      const [type = '기타', channelName = '', videoDate = '', timestamp = '', note = ''] = line.split('|').map((part) => part.trim());

      if (!channelName) {
        return null;
      }

      return {
        type: type || '기타',
        channelName,
        videoDate,
        timestamp,
        note
      };
    })
    .filter(Boolean);
}
