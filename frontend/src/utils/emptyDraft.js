// frontend/src/utils/emptyDraft.js
// issueDraft 기본 구조를 전부 정의한 객체다.
// AdminNewPage/AdminEditPage에서 상태 초기값으로 사용하며 localStorage('adminDraftV4')에도 저장된다.
// easySummary가 맨 앞에 위치하도록 Step 12 이후 최종 스키마 순서를 그대로 따른다.
export const emptyDraft = {
  // 쉬운 요약은 일반인을 위한 한 줄 설명이다.
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

  sources: [],
};

// 참고: localStorage에는 항상 'adminDraftV4' 키로 저장하며, 스키마가 바뀌면 버전을 올려야 한다.
