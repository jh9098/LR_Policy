// frontend/src/utils/emptyDraft.js
// issueDraft 기본 구조를 정의한다. 이 객체는 폼 초기화와 로컬스토리지 복구 시 기준값으로 사용된다.
export const emptyDraft = {
  title: '',
  date: '',
  category: '기타',
  summaryCard: '',
  background: '',
  keyPoints: [],
  progressiveView: undefined,
  conservativeView: undefined,
  impactToLife: undefined,
  sources: []
};
