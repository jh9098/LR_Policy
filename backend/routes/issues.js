/*
  현재 프론트엔드는 Firestore Web SDK를 통해 직접
  issues 문서에 대해 create / update / delete 까지 수행한다.
  즉 이 Express 서버(Render)는 런타임에서 더 이상 사용되지 않고 있다.
  이 서버 코드는 향후 "보안 강화/권한 제어"를 위해 남겨둔 레거시 초안일 뿐이다.
  TODO(프로덕션): /admin 접근 제한 + Firestore 보안 규칙 잠그기 + 이 서버에서만 쓰기 허용하는 구조로 전환해야 한다.
*/

// backend/routes/issues.js
// Step 12: easySummary 필드를 포함해 issueDraft 스키마를 Firestore에 저장/조회한다. null 섹션은 필드를 생략한다.

const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

const THEME_CATEGORY_STRUCTURE = Object.freeze({
  policy: Object.freeze({
    categories: Object.freeze({
      부동산: Object.freeze(['주거·주택공급 정책', '전월세·임대차 제도', '재건축·재개발·도시정비', '부동산 세제·규제']),
      '노동/노조': Object.freeze(['임금·근로조건 정책', '노사협상·파업 이슈', '고용·산재·안전 규제', '산업별 노동 현안']),
      '사법/검찰': Object.freeze(['수사·기소·사건 처리', '법원 판결·양형 논쟁', '사법개혁·제도개편', '감찰·징계·인사']),
      '외교/안보': Object.freeze(['정상외교·국제협력', '군사·방위 정책', '동맹 현안', '대북·통일 정책']),
      기타: Object.freeze(['국회·정당·정치개혁', '복지·보건·교육 정책', '과학·디지털·규제 혁신', '환경·에너지 전환'])
    })
  }),
  parenting: Object.freeze({
    categories: Object.freeze({
      '임신/출산 준비': Object.freeze(['임신 건강관리', '출산 준비물·체크리스트', '산후 회복·케어', '정부 지원·제도']),
      '0~2세 영아': Object.freeze(['수면·일상 루틴', '모유수유·이유식', '발달 자극 놀이', '예방접종·건강관리']),
      '3~5세 유아': Object.freeze(['언어·사회성 발달', '놀이·교육 활동', '생활습관·훈육', '어린이집·유치원 준비']),
      '6세 이상': Object.freeze(['학습 습관·학교생활', '정서·행동 지원', '안전교육·생활기술', '돌봄·방과후 프로그램'])
    })
  }),
  lifestyle: Object.freeze({
    categories: Object.freeze({
      '행정/정부 서비스': Object.freeze(['민원·증명서 발급', '복지·지원금 신청', '전입·주거 행정', '교통·운전 절차']),
      '금융/세무': Object.freeze(['세금·연말정산', '대출·금융상품', '재테크·저축 전략', '보험·보장 점검']),
      '소비/쇼핑': Object.freeze(['생활필수품 추천', '가전·디지털', '푸드·외식', '여행·문화 할인']),
      생활관리: Object.freeze(['청소·정리수납', '건강·운동 루틴', '에너지 절약·광열비', '반려동물 케어'])
    })
  }),
  health: Object.freeze({
    categories: Object.freeze({
      '만성질환 관리': Object.freeze(['심혈관 질환', '당뇨·대사증후군', '호흡기·알레르기', '근골격계·통증']),
      정신건강: Object.freeze(['우울·불안 관리', 'ADHD·집중력', '치매·인지장애', '수면·스트레스']),
      '생애주기 건강': Object.freeze(['소아·청소년 건강', '여성 건강', '남성 건강', '노년 건강']),
      '예방/응급': Object.freeze(['예방접종·검진', '응급 상황 대응', '운동·재활', '영양·식단'])
    })
  }),
  ai: Object.freeze({
    categories: Object.freeze({
      'AI 기초·트렌드': Object.freeze(['AI 개념 한입 요약', 'AI 용어사전', 'AI 기술·역사 스토리', 'AI 트렌드 브리핑']),
      'AI 도구·서비스 활용': Object.freeze(['챗봇·텍스트 AI 활용', '이미지·영상·음성 AI', '문서·노트·업무 도구', '국내 AI 서비스 지도']),
      '업무·생산성·자동화': Object.freeze(['문서·보고서 자동화', '엑셀·데이터 정리 자동화', '직장인 업무루틴 자동화', '고객응대·CS 보조']),
      '코딩·노코드·워크플로 자동화': Object.freeze(['프롬프트 엔지니어링', '코딩 도우미 활용법', '노코드·로우코드 자동화', 'API·봇 만들기 기초']),
      'AI 부업·창업·수익화': Object.freeze(['AI 부업 아이디어 모음', '콘텐츠·마케팅 수익화', 'SaaS·서비스 기획', '프리랜서·외주 활용']),
      '콘텐츠 제작·유튜브·블로그': Object.freeze(['블로그 자동작성·최적화', '유튜브·쇼츠 스크립트 공장', 'SNS·쓰레드 자동화', '카피라이팅·광고 문구']),
      '교육·육아·자기계발에서의 AI': Object.freeze(['학습 도우미로 쓰는 AI', '유아·육아 AI 활용', '커리어·스킬업 플랜', '멘탈·생산성 관리']),
      'AI 이슈·윤리·정책': Object.freeze(['국내 AI 정책·규제 동향', '해외 AI 규제·사례', 'AI 윤리·프라이버시', '직장 내 AI 사용 가이드']),
      'AI 툴·사례 아카이브': Object.freeze(['분야별 AI 툴 지도', '실전 활용 사례 모음', '워크플로 레시피 모음', '템플릿·체크리스트'])
    })
  })
});
const SOURCE_TYPE_OPTIONS = new Set(['official', 'youtube', 'media', 'etc']);
const THEME_OPTIONS = new Set(['policy', 'stocks', 'ai', 'parenting', 'lifestyle', 'health', 'groupbuy', 'support']);
const DEFAULT_THEME_ID = 'policy';

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function getThemeCategoryMap(themeId) {
  const key = themeId && THEME_CATEGORY_STRUCTURE[themeId] ? themeId : DEFAULT_THEME_ID;
  return THEME_CATEGORY_STRUCTURE[key]?.categories ?? null;
}

function getCategoryOptions(themeId) {
  const map = getThemeCategoryMap(themeId);
  if (!map) {
    return [];
  }
  return Object.keys(map);
}

function getDefaultCategory(themeId) {
  const options = getCategoryOptions(themeId);
  return options.length > 0 ? options[0] : '';
}

function getSubcategoryOptions(themeId, category) {
  const map = getThemeCategoryMap(themeId);
  if (!map) {
    return [];
  }
  return map[category] ?? [];
}

function toSafeString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function toStringArray(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => toSafeString(item));
}

function toSafeCategory(theme, value) {
  const candidate = toSafeString(value);
  const options = getCategoryOptions(theme);
  if (options.length === 0) {
    return '';
  }
  return options.includes(candidate) ? candidate : getDefaultCategory(theme);
}

function toSafeTheme(value) {
  const candidate = toSafeString(value);
  return THEME_OPTIONS.has(candidate) ? candidate : DEFAULT_THEME_ID;
}

function toSafeSubcategory(theme, category, value) {
  const candidate = toSafeString(value);
  const options = getSubcategoryOptions(theme, category);
  if (!Array.isArray(options) || options.length === 0) {
    return '';
  }
  return options.includes(candidate) ? candidate : '';
}

function toSafeSourceType(value) {
  const candidate = toSafeString(value);
  return SOURCE_TYPE_OPTIONS.has(candidate) ? candidate : 'etc';
}

function toSafeIntensity(value) {
  if (value === '' || value === null || value === undefined) {
    return -1;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return -1;
  }
  if (numeric === -1) {
    return -1;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePerspectiveForSave(view, defaultNote) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  return {
    headline: toSafeString(view.headline),
    bullets: toStringArray(view.bullets),
    intensity: toSafeIntensity(view.intensity),
    note: toSafeString(view.note) || defaultNote
  };
}

function normalizeImpactForSave(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }

  return {
    text: toSafeString(impact.text),
    note: toSafeString(impact.note) || IMPACT_NOTE
  };
}

function normalizeSourcesForSave(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources.map((source) => ({
    type: toSafeSourceType(source?.type),
    channelName: toSafeString(source?.channelName),
    sourceDate: toSafeString(source?.sourceDate),
    timestamp: toSafeString(source?.timestamp),
    note: toSafeString(source?.note)
  }));
}

function buildIssueDocument(body) {
  const safeTheme = toSafeTheme(body.theme);
  const safeCategory = toSafeCategory(safeTheme, body.category);
  const base = {
    theme: safeTheme,
    easySummary: toSafeString(body.easySummary),
    title: toSafeString(body.title),
    date: toSafeString(body.date),
    category: safeCategory,
    subcategory: toSafeSubcategory(safeTheme, safeCategory, body.subcategory),
    summaryCard: toSafeString(body.summaryCard),
    background: toSafeString(body.background),
    keyPoints: toStringArray(body.keyPoints),
    sources: normalizeSourcesForSave(body.sources)
  };

  if (body.progressiveView !== null && body.progressiveView !== undefined) {
    const progressiveView = normalizePerspectiveForSave(body.progressiveView, PROGRESSIVE_NOTE);
    if (progressiveView) {
      base.progressiveView = progressiveView;
    }
  }

  if (body.conservativeView !== null && body.conservativeView !== undefined) {
    const conservativeView = normalizePerspectiveForSave(body.conservativeView, CONSERVATIVE_NOTE);
    if (conservativeView) {
      base.conservativeView = conservativeView;
    }
  }

  if (body.impactToLife !== null && body.impactToLife !== undefined) {
    const impactToLife = normalizeImpactForSave(body.impactToLife);
    if (impactToLife) {
      base.impactToLife = impactToLife;
    }
  }

  return base;
}

function validateIssueDocument(document) {
  if (!document.title || !document.date || !document.summaryCard || !document.background) {
    return 'title, date, summaryCard, background 필드는 비워둘 수 없습니다.';
  }
  if (!Array.isArray(document.keyPoints) || document.keyPoints.length === 0) {
    return 'keyPoints 배열에 최소 1개 이상의 항목이 필요합니다.';
  }
  if (!Array.isArray(document.sources) || document.sources.length === 0) {
    return 'sources 배열에 최소 1개 이상의 출처가 필요합니다.';
  }
  return null;
}

function convertTimestamp(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value;
}

function normalizePerspectiveForOutput(view, defaultNote) {
  if (!view || typeof view !== 'object') {
    return undefined;
  }

  const headline = toSafeString(view.headline);
  const bullets = toStringArray(view.bullets);
  const intensity = toSafeIntensity(view.intensity);
  const note = toSafeString(view.note) || defaultNote;

  if (!headline && bullets.length === 0 && intensity === -1) {
    return undefined;
  }

  return { headline, bullets, intensity, note };
}

function normalizeImpactForOutput(impact) {
  if (!impact || typeof impact !== 'object') {
    return undefined;
  }
  const text = toSafeString(impact.text);
  const note = toSafeString(impact.note) || IMPACT_NOTE;
  if (!text) {
    return undefined;
  }
  return { text, note };
}

function normalizeSourcesForOutput(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources.map((source) => ({
    type: toSafeSourceType(source?.type),
    channelName: toSafeString(source?.channelName),
    sourceDate: toSafeString(source?.sourceDate),
    timestamp: toSafeString(source?.timestamp),
    note: toSafeString(source?.note)
  }));
}

function toIssueSummary(doc) {
  const data = doc.data();
  const theme = toSafeTheme(data.theme);
  const category = toSafeCategory(theme, data.category);
  const subcategory = toSafeSubcategory(theme, category, data.subcategory);
  return {
    id: doc.id,
    theme,
    easySummary: toSafeString(data.easySummary),
    title: toSafeString(data.title),
    date: toSafeString(data.date),
    category,
    subcategory,
    summaryCard: toSafeString(data.summaryCard)
  };
}

function toIssueDetail(doc) {
  const data = doc.data();
  const theme = toSafeTheme(data.theme);
  const category = toSafeCategory(theme, data.category);
  const subcategory = toSafeSubcategory(theme, category, data.subcategory);
  const issue = {
    id: doc.id,
    theme,
    easySummary: toSafeString(data.easySummary),
    title: toSafeString(data.title),
    date: toSafeString(data.date),
    category,
    subcategory,
    summaryCard: toSafeString(data.summaryCard),
    background: toSafeString(data.background),
    keyPoints: toStringArray(data.keyPoints),
    sources: normalizeSourcesForOutput(data.sources),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  };

  const progressiveView = normalizePerspectiveForOutput(data.progressiveView, PROGRESSIVE_NOTE);
  if (progressiveView) {
    issue.progressiveView = progressiveView;
  }

  const conservativeView = normalizePerspectiveForOutput(data.conservativeView, CONSERVATIVE_NOTE);
  if (conservativeView) {
    issue.conservativeView = conservativeView;
  }

  const impactToLife = normalizeImpactForOutput(data.impactToLife);
  if (impactToLife) {
    issue.impactToLife = impactToLife;
  }

  return issue;
}

// TODO: 현재 검색 구현은 최근 50건만 대상으로 하므로, 데이터가 늘어나면 Firestore 색인과 검색 인프라 확장이 필요하다.
// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.get('/search', async (req, res) => {
  try {
    const { category, query } = req.query;
    const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').limit(50).get();

    const categoryFilter = typeof category === 'string' ? category.trim() : '';
    const keyword = typeof query === 'string' ? query.trim().toLowerCase() : '';

    const issues = snapshot.docs
      .map((doc) => toIssueSummary(doc))
      .filter((issue) => {
        const matchCategory = !categoryFilter || issue.category === categoryFilter;
        if (!keyword) {
          return matchCategory;
        }
        const title = issue.title.toLowerCase();
        const summary = issue.summaryCard.toLowerCase();
        return matchCategory && (title.includes(keyword) || summary.includes(keyword));
      });

    res.json(issues);
  } catch (error) {
    console.error('GET /api/issues/search 오류:', error);
    res.status(500).json({ message: '검색 중 오류가 발생했습니다.' });
  }
});

// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').limit(20).get();
    // 목록에서도 easySummary를 제공하면 홈 카드와 상세 링크에서 동일한 문구를 재사용할 수 있다.
    const issues = snapshot.docs.map((doc) => toIssueSummary(doc));
    res.json(issues);
  } catch (error) {
    console.error('GET /api/issues 오류:', error);
    res.status(500).json({ message: '이슈 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.get('/:id', async (req, res) => {
  try {
    const issueId = req.params.id;
    const docRef = db.collection('issues').doc(issueId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const metricsRef = db.collection('metrics').doc(issueId);
    // TODO: 지금은 인증이 없으므로 악의적 호출 방지가 어렵다. 추후 rate limiting 과 인증을 강화해야 한다.
    await metricsRef.set(
      {
        views: FieldValue.increment ? FieldValue.increment(1) : 1,
        lastViewedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    res.json(toIssueDetail(docSnap));
  } catch (error) {
    console.error(`GET /api/issues/${req.params.id} 오류:`, error);
    res.status(500).json({ message: '이슈를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.post('/', async (req, res) => {
  try {
    // TODO: 운영 단계에서는 x-admin-secret 같은 관리자 인증을 반드시 붙여야 한다.
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'issueDraft 객체를 JSON으로 전달해 주세요.' });
    }

    const document = buildIssueDocument(req.body);
    const validationError = validateIssueDocument(document);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const collection = db.collection('issues');
    const docRef = collection.doc();

    await docRef.set(
      {
        ...document,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: false }
    );

    const savedDoc = await docRef.get();
    res.status(201).json(toIssueDetail(savedDoc));
  } catch (error) {
    console.error('POST /api/issues 오류:', error);
    res.status(500).json({ message: '이슈를 저장하는 중 오류가 발생했습니다.' });
  }
});

// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.put('/:id', async (req, res) => {
  try {
    // TODO: 운영 단계에서는 PUT 요청에도 관리자 인증과 권한 검증을 적용해야 한다.
    const issueId = req.params.id;
    if (!issueId) {
      return res.status(400).json({ message: '문서 ID가 필요합니다.' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'issueDraft 객체를 JSON으로 전달해 주세요.' });
    }

    const docRef = db.collection('issues').doc(issueId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const document = buildIssueDocument(req.body);
    const validationError = validateIssueDocument(document);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await docRef.set(
      {
        ...document,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: false }
    );

    const updatedDoc = await docRef.get();
    res.json(toIssueDetail(updatedDoc));
  } catch (error) {
    console.error(`PUT /api/issues/${req.params.id} 오류:`, error);
    res.status(500).json({ message: '이슈를 수정하는 중 오류가 발생했습니다.' });
  }
});

// 현재 프런트는 Firestore Web SDK로 직접 CRUD를 수행하므로, 아래 라우트는 레거시 참고용이다.
router.delete('/:id', async (req, res) => {
  try {
    // TODO: 운영 단계에서는 DELETE 요청에도 관리자 인증을 강제해야 한다.
    const issueId = req.params.id;
    if (!issueId) {
      return res.status(400).json({ message: '문서 ID가 필요합니다.' });
    }

    const docRef = db.collection('issues').doc(issueId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    await docRef.delete();

    const metricsRef = db.collection('metrics').doc(issueId);
    await metricsRef.delete().catch((error) => {
      console.warn(`metrics/${issueId} 삭제 중 경고:`, error.message);
    });

    res.json({ id: issueId, message: '문서를 삭제했습니다.' });
  } catch (error) {
    console.error(`DELETE /api/issues/${req.params.id} 오류:`, error);
    res.status(500).json({ message: '이슈를 삭제하는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
