// frontend/src/utils/emptyDraft.js
// issueDraft 스키마 전체를 기본값으로 정의한다.
// 모든 필드는 AdminNewPage.jsx에서 useState로 관리되며, localStorage('adminDraftV4') 백업에도 동일하게 사용된다.
export const emptyDraft = {
  // 쉬운 요약은 일반 방문자를 위한 한 줄 설명이다.
  easySummary: '',

  title: '',
  date: '',
  category: '기타',
  summaryCard: '',

  background: '',

  keyPoints: [],

  progressiveView: null,
  conservativeView: null,
  impactToLife: null,

  sources: []
};
