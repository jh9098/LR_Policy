// backend/routes/issues.js
// issueDraft 스키마 기반 CRUD 라우터. JSON 입력은 엄격히 검증하고, Firestore에는 검증된 데이터만 저장한다.
const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

const CATEGORY_OPTIONS = new Set(['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타']);
const SOURCE_TYPE_OPTIONS = new Set(['official', 'youtube', 'media', 'etc']);

function toTrimmedString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function clampIntensity(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return -1;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return -1;
  }
  if (numeric === -1) {
    return -1;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function sanitizeBulletArray(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizePerspectiveInput(view, fieldName) {
  if (view === null || view === undefined) {
    return null;
  }
  if (typeof view !== 'object' || Array.isArray(view)) {
    throw new Error(`${fieldName} 필드는 객체이거나 null 이어야 합니다.`);
  }

  const headline = toTrimmedString(view.headline ?? '');
  const bullets = sanitizeBulletArray(view.bullets);
  const intensity = clampIntensity(view.intensity);
  const note = typeof view.note === 'string' ? view.note : '';

  return {
    headline,
    bullets,
    intensity,
    note
  };
}

function hasPerspectiveContent(view) {
  if (!view) {
    return false;
  }
  if (view.headline) {
    return true;
  }
  if (Array.isArray(view.bullets) && view.bullets.length > 0) {
    return true;
  }
  if (typeof view.note === 'string' && view.note.trim().length > 0) {
    return true;
  }
  if (typeof view.intensity === 'number' && view.intensity !== -1) {
    return true;
  }
  return false;
}

function sanitizeImpactInput(impact) {
  if (impact === null || impact === undefined) {
    return null;
  }
  if (typeof impact !== 'object' || Array.isArray(impact)) {
    throw new Error('impactToLife 필드는 객체이거나 null 이어야 합니다.');
  }
  const text = toTrimmedString(impact.text ?? '');
  const note = typeof impact.note === 'string' ? impact.note : '';
  if (!text && !note) {
    return null;
  }
  return note ? { text, note } : { text };
}

function sanitizeSourcesForStorage(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('sources 배열을 최소 1개 이상 전달해야 합니다.');
  }

  const invalidSource = sources.some((source) => !source || typeof source !== 'object' || Array.isArray(source));
  if (invalidSource) {
    throw new Error('sources 배열의 각 항목은 객체 형태여야 합니다.');
  }

  // TODO: 필요시 채널명/날짜 포맷 검증을 추가한다.
  return sources.map((source) => ({ ...source }));
}

function validateIssueDraft(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: '요청 본문이 잘못되었습니다. issueDraft 객체를 전달해 주세요.' };
  }

  const title = toTrimmedString(payload.title ?? '');
  const date = toTrimmedString(payload.date ?? '');
  const categoryRaw = toTrimmedString(payload.category ?? '');
  const category = CATEGORY_OPTIONS.has(categoryRaw) ? categoryRaw : '기타';
  const summaryCard = toTrimmedString(payload.summaryCard ?? '');
  const background = toTrimmedString(payload.background ?? '');
  const keyPoints = sanitizeBulletArray(payload.keyPoints);

  if (!title || !date || !summaryCard || !background) {
    return { ok: false, error: 'title, date, summaryCard, background 필드는 반드시 채워야 합니다.' };
  }
  if (keyPoints.length === 0) {
    return { ok: false, error: 'keyPoints 배열에 최소 1개 이상의 bullet을 입력해 주세요.' };
  }

  let sources;
  try {
    sources = sanitizeSourcesForStorage(payload.sources);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  let progressiveView;
  let conservativeView;
  let impactToLife;

  try {
    progressiveView = sanitizePerspectiveInput(payload.progressiveView, 'progressiveView');
    conservativeView = sanitizePerspectiveInput(payload.conservativeView, 'conservativeView');
    impactToLife = sanitizeImpactInput(payload.impactToLife);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const draft = {
    title,
    date,
    category,
    summaryCard,
    background,
    keyPoints,
    sources
  };

  if (hasPerspectiveContent(progressiveView)) {
    draft.progressiveView = progressiveView;
  }
  if (hasPerspectiveContent(conservativeView)) {
    draft.conservativeView = conservativeView;
  }
  if (impactToLife) {
    draft.impactToLife = impactToLife;
  }

  return { ok: true, draft };
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

function sanitizePerspectiveForResponse(view) {
  if (!view || typeof view !== 'object') {
    return null;
  }
  const headline = toTrimmedString(view.headline ?? '');
  const bullets = sanitizeBulletArray(view.bullets);
  const intensity = typeof view.intensity === 'number' ? clampIntensity(view.intensity) : -1;
  const note = typeof view.note === 'string' ? view.note : '';

  const perspective = {
    headline,
    bullets,
    intensity,
    note
  };

  return hasPerspectiveContent(perspective) ? perspective : null;
}

function sanitizeImpactForResponse(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }
  const text = toTrimmedString(impact.text ?? '');
  const note = typeof impact.note === 'string' ? impact.note : '';
  if (!text) {
    return null;
  }
  return note ? { text, note } : { text };
}

function sanitizeSourcesForResponse(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources
    .map((source) => ({
      type: SOURCE_TYPE_OPTIONS.has(source?.type) ? source.type : 'etc',
      channelName: toTrimmedString(source?.channelName ?? ''),
      sourceDate: toTrimmedString(source?.sourceDate ?? ''),
      timestamp: toTrimmedString(source?.timestamp ?? ''),
      note: typeof source?.note === 'string' ? source.note : ''
    }))
    .filter((source) => source.channelName.length > 0);
}

function toIssueSummary(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    date: data.date || '',
    category: data.category || '기타',
    summaryCard: data.summaryCard || ''
  };
}

function toIssueDetail(doc) {
  const data = doc.data();
  const issue = {
    id: doc.id,
    title: data.title || '',
    date: data.date || '',
    category: data.category || '기타',
    summaryCard: data.summaryCard || '',
    background: data.background || '',
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    sources: sanitizeSourcesForResponse(data.sources),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  };

  const progressiveView = sanitizePerspectiveForResponse(data.progressiveView);
  if (progressiveView) {
    issue.progressiveView = progressiveView;
  }

  const conservativeView = sanitizePerspectiveForResponse(data.conservativeView);
  if (conservativeView) {
    issue.conservativeView = conservativeView;
  }

  const impactToLife = sanitizeImpactForResponse(data.impactToLife);
  if (impactToLife) {
    issue.impactToLife = impactToLife;
  }

  return issue;
}

// TODO: 현재 검색 구현은 최근 50건을 불러와 메모리에서 필터링한다. 데이터가 늘어나면 색인 구축이 필요하다.
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

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').limit(20).get();
    const issues = snapshot.docs.map((doc) => toIssueSummary(doc));
    res.json(issues);
  } catch (error) {
    console.error('GET /api/issues 오류:', error);
    res.status(500).json({ message: '이슈 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const docRef = db.collection('issues').doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const metricsRef = db.collection('metrics').doc(docSnap.id);
    // TODO: 단순 증분 방식이라 악의적 반복 호출 방어가 어렵다. 추후 rate limiting과 인증을 강화해야 한다.
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

router.post('/', async (req, res) => {
  try {
    // TODO: 운영 단계에서는 x-admin-secret 같은 관리자 인증을 반드시 적용해야 한다.
    const { ok, draft, error } = validateIssueDraft(req.body);
    if (!ok) {
      return res.status(400).json({ message: error });
    }

    const docRef = db.collection('issues').doc();
    await docRef.set(
      {
        ...draft,
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

router.put('/:id', async (req, res) => {
  try {
    // TODO: PUT 요청에도 관리자 인증 및 권한 검증을 추가해야 한다.
    const issueId = req.params.id;
    if (!issueId) {
      return res.status(400).json({ message: '문서 ID가 필요합니다.' });
    }

    const docRef = db.collection('issues').doc(issueId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const { ok, draft, error } = validateIssueDraft(req.body);
    if (!ok) {
      return res.status(400).json({ message: error });
    }

    await docRef.set(
      {
        ...draft,
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

router.delete('/:id', async (req, res) => {
  try {
    // TODO: DELETE 요청 실행 시 관리자 인증을 필수로 적용해야 한다.
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
