// frontend/src/constants/categoryStructure.js
// 테마별 상위/하위 카테고리를 단일 진실(Single Source of Truth)로 관리한다.
// 모든 화면과 유틸에서 이 구조를 import 해 사용한다.

const FALLBACK_THEME_ID = 'policy';

export const THEME_CATEGORY_STRUCTURE = Object.freeze({
  policy: Object.freeze({
    categories: Object.freeze({
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
    })
  }),
  stocks: Object.freeze({
    categories: Object.freeze({
      '시장/지수': Object.freeze([
        '코스피/코스닥 동향',
        '금리/환율',
        '수급/수요공급',
        '변동성/파생'
      ]),
      '산업/섹터': Object.freeze([
        '반도체',
        '2차전지/전기차',
        '인터넷/게임',
        '바이오/헬스케어'
      ]),
      '기업/실적': Object.freeze([
        '실적발표',
        '가이던스/IR',
        '신사업/M&A',
        '규제/리스크'
      ]),
      '거시/정책': Object.freeze([
        '금리/통화정책',
        '재정/세제',
        '산업정책/보조금',
        '무역/지정학'
      ]),
      투자전략: Object.freeze([
        '밸류/퀄리티',
        '성장/모멘텀',
        '배당/리츠',
        '퀀트/리밸런싱'
      ])
    })
  }),
  parenting: Object.freeze({
    categories: Object.freeze({
      '임신/출산 준비': Object.freeze([
        '임신 건강관리',
        '출산 준비물·체크리스트',
        '산후 회복·케어',
        '정부 지원·제도'
      ]),
      '0~2세 영아': Object.freeze([
        '수면·일상 루틴',
        '모유수유·이유식',
        '발달 자극 놀이',
        '예방접종·건강관리'
      ]),
      '3~5세 유아': Object.freeze([
        '언어·사회성 발달',
        '놀이·교육 활동',
        '생활습관·훈육',
        '어린이집·유치원 준비'
      ]),
      '6세 이상': Object.freeze([
        '학습 습관·학교생활',
        '정서·행동 지원',
        '안전교육·생활기술',
        '돌봄·방과후 프로그램'
      ])
    })
  }),
  lifestyle: Object.freeze({
    categories: Object.freeze({
      '행정/정부 서비스': Object.freeze([
        '민원·증명서 발급',
        '복지·지원금 신청',
        '전입·주거 행정',
        '교통·운전 절차'
      ]),
      '금융/세무': Object.freeze([
        '세금·연말정산',
        '대출·금융상품',
        '재테크·저축 전략',
        '보험·보장 점검'
      ]),
      '소비/쇼핑': Object.freeze([
        '생활필수품 추천',
        '가전·디지털',
        '푸드·외식',
        '여행·문화 할인'
      ]),
      생활관리: Object.freeze([
        '청소·정리수납',
        '건강·운동 루틴',
        '에너지 절약·광열비',
        '반려동물 케어'
      ])
    })
  }),
  health: Object.freeze({
    categories: Object.freeze({
      '만성질환 관리': Object.freeze([
        '심혈관 질환',
        '당뇨·대사증후군',
        '호흡기·알레르기',
        '근골격계·통증'
      ]),
      정신건강: Object.freeze([
        '우울·불안 관리',
        'ADHD·집중력',
        '치매·인지장애',
        '수면·스트레스'
      ]),
      '생애주기 건강': Object.freeze([
        '소아·청소년 건강',
        '여성 건강',
        '남성 건강',
        '노년 건강'
      ]),
      '예방/응급': Object.freeze([
        '예방접종·검진',
        '응급 상황 대응',
        '운동·재활',
        '영양·식단'
      ])
    })
  }),
  support: Object.freeze({
    categories: Object.freeze({
      생활지원: Object.freeze(['긴급복지·생계지원', '에너지·통신비 지원', '문화·여가 바우처', '기타 생활안정']),
      '육아/교육': Object.freeze(['임신·출산 지원금', '영유아 보육·양육수당', '초중고 교육비 지원', '청년 교육·장학금']),
      '취업/창업': Object.freeze(['구직활동·실업급여', '직업훈련·역량강화', '청년·중장년 일자리', '소상공인·창업자금']),
      '주거/복지': Object.freeze(['주거안정·월세대출', '공공임대·주택공급', '의료비·건강보험 지원', '장애인·노인 복지'])
    })
  })
});

function getThemeCategoryMap(themeId) {
  const themeKey = themeId && THEME_CATEGORY_STRUCTURE[themeId] ? themeId : FALLBACK_THEME_ID;
  return THEME_CATEGORY_STRUCTURE[themeKey]?.categories ?? null;
}

export function getCategoryOptions(themeId) {
  const map = getThemeCategoryMap(themeId);
  if (!map) {
    return [];
  }
  return Object.keys(map);
}

export function getCategoryFilterOptions(themeId) {
  const categories = getCategoryOptions(themeId);
  if (categories.length === 0) {
    return ['전체'];
  }
  return ['전체', ...categories];
}

export function getDefaultCategory(themeId) {
  const categories = getCategoryOptions(themeId);
  return categories.length > 0 ? categories[0] : '';
}

export function getSubcategoryOptions(themeId, category) {
  const map = getThemeCategoryMap(themeId);
  if (!map) {
    return [];
  }
  return map[category] ?? [];
}

export function isValidCategory(themeId, candidate) {
  if (!candidate) {
    return false;
  }
  return getCategoryOptions(themeId).includes(candidate);
}

export function isValidSubcategory(themeId, category, subcategory) {
  if (!subcategory) {
    return false;
  }
  return getSubcategoryOptions(themeId, category).includes(subcategory);
}
