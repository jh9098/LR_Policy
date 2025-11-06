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
        '2차전지',
        '반도체',
        'AI·로봇',
        '스마트폰·모바일',
        '전력·에너지',
        '원자력',
        '친환경·탄소',
        '자원·소재',
        '자동차·모빌리티',
        '항공·우주',
        '조선·해운·LNG',
        '건설·인프라',
        '철강',
        '화학·정유·윤활유·LPG',
        'IT·통신',
        '금융',
        '유통·소비',
        '여행·레저',
        '엔터·캐릭터',
        '헬스케어·바이오',
        '감염병·방역',
        '식품·생활',
        '제조장비·공작기계',
        '보안·양자',
        '정책·국산화·매크로',
        'IPO·SPAC·개별기업'
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
        '심혈관(고혈압·고지혈증·심부전)',
        '당뇨·비만·대사증후군',
        '호흡기(천식·COPD)·알레르기(비염·아토피)',
        '소화기(역류·과민성 장·간·담·췌장)',
        '갑상선·호르몬',
        '신장·비뇨',
        '근골격/통증(허리디스크·어깨·무릎)',
        '피부·탈모'
      ]),
      정신건강: Object.freeze([
        '우울·불안',
        '공황·강박·외상후 스트레스',
        'ADHD·주의집중',
        '중독(게임·스마트폰·물질)',
        '수면장애',
        '치매·경도인지',
        '가족·양육 스트레스'
      ]),
      '생애주기 건강': Object.freeze([
        '소아·청소년 건강',
        '여성 건강(월경·임신·산후·갱년기)',
        '남성 건강(전립선·성건강)',
        '중년·노년 건강(낙상·근감소)'
      ]),
      '예방/응급': Object.freeze([
        '예방접종·검진(국가검진·암검진)',
        '응급 상황 대응(흉통·뇌졸중·질식·화상)',
        '재활·물리치료',
        '운동(유산소·근력·유연성)',
        '영양·식단(지중해식·단백질)',
        '가정상비약·의약품'
      ]),
      '증상별 가이드': Object.freeze([
        '발열·기침·목통증',
        '두통·어지럼',
        '흉통·호흡곤란',
        '복통·소화불량·설사/변비',
        '요통·관절통',
        '피부발진·두드러기',
        '눈·치과 증상'
      ]),
      '검사/수치 해석': Object.freeze([
        '혈압·혈당·지질·간/신장 수치',
        '갑상선·호르몬',
        '비타민·영양지표',
        '영상검사·내시경 기본'
      ])
    })
  }),
  support: Object.freeze({
    categories: Object.freeze({
      생활지원: Object.freeze([
        '긴급복지·생계',
        '에너지·통신/교통비',
        '문화·여가 바우처',
        '기타 생활안정'
      ]),
      '육아/교육': Object.freeze([
        '임신·출산 지원금',
        '영유아 보육·양육수당',
        '초중고 교육비',
        '청년 교육·장학금',
        '특수교육·돌봄'
      ]),
      '취업/창업': Object.freeze([
        '구직활동·실업급여',
        '직업훈련·내일배움',
        '청년·중장년 일자리',
        '소상공인·창업·정책자금',
        '사회적기업·협동조합'
      ]),
      '주거/복지': Object.freeze([
        '주거안정·월세/보증금',
        '공공임대·주택공급·주택수선',
        '의료비·건강보험 지원',
        '장애인·노인·돌봄'
      ]),
      '금융/세제': Object.freeze([
        '근로·자녀장려금',
        '세액공제·환급',
        '신용회복·채무조정',
        '서민금융·햇살론'
      ]),
      '문화/체육/여행': Object.freeze([
        '문화누리·통합문화이용권',
        '스포츠강좌이용권',
        '관광/휴가 바우처',
        '지역상품권·지역화폐'
      ]),
      '디지털/환경': Object.freeze([
        '디지털 교육·기기 보급',
        '에너지효율·그린리모델링',
        '전기차·충전·친환경 보조',
        '태양광·신재생'
      ]),
      '재난/안전': Object.freeze([
        '재난지원금',
        '피해복구·저금리대출',
        '소상공인 재난지원',
        '주택피해 지원'
      ]),
      '지역/지자체': Object.freeze([
        '광역·기초 지자체 특화사업',
        '청년·신혼·고령층 지역 맞춤'
      ])
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
