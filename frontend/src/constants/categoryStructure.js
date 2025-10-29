// frontend/src/constants/categoryStructure.js
// 상위 카테고리와 하위 카테고리를 한 곳에서 관리해 중복을 줄인다.
// 모든 화면과 유틸에서 이 구조를 import 해 사용한다.
export const CATEGORY_STRUCTURE = Object.freeze({
  부동산: Object.freeze([
    '주거·주택공급 정책',
    '전월세·임대차 제도',
    '재건축·재개발·도시정비',
    '부동산 세제·규제'
  ]),
  '노동/노조': Object.freeze([
    '임금·근로조건 정책',
    '노사협상·파업 이슈',
    '고용·산재·안전 규제',
    '산업별 노동 현안'
  ]),
  '사법/검찰': Object.freeze([
    '수사·기소·사건 처리',
    '법원 판결·양형 논쟁',
    '사법개혁·제도개편',
    '감찰·징계·인사'
  ]),
  '외교/안보': Object.freeze([
    '정상외교·국제협력',
    '군사·방위 정책',
    '동맹 현안',
    '대북·통일 정책'
  ]),
  기타: Object.freeze([
    '국회·정당·정치개혁',
    '복지·보건·교육 정책',
    '과학·디지털·규제 혁신',
    '환경·에너지 전환'
  ])
});

export const CATEGORY_OPTIONS = Object.freeze(Object.keys(CATEGORY_STRUCTURE));
export const CATEGORY_FILTER_OPTIONS = Object.freeze(['전체', ...CATEGORY_OPTIONS]);

export function isValidCategory(candidate) {
  return CATEGORY_OPTIONS.includes(candidate);
}

export function getSubcategoryOptions(category) {
  return CATEGORY_STRUCTURE[category] ?? [];
}

export function isValidSubcategory(category, subcategory) {
  if (!subcategory) {
    return false;
  }
  return getSubcategoryOptions(category).includes(subcategory);
}
