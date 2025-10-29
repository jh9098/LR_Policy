// backend/routes/issues.js
// Step 11B에 맞춰 issueDraft 스키마 그대로를 Firestore에 저장하고, null 섹션은 필드를 생략한다.

const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

const CATEGORY_OPTIONS = new Set(['부동산', '노동/노조', '사법/검찰', '외교/안보', '기타']);
const SOURCE_TYPE_OPTIONS = new Set(['official', 'youtube', 'media', 'etc']);

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

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

function toSafeCategory(value) {
  const candidate = toSafeString(value);
  return CATEGORY_OPTIONS.has(candidate) ? candidate : '기타';
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
  const base = {
    title: toSafeString(body.title),
    date: toSafeString(body.date),
    category: toSafeCategory(body.category),
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
  return {
    id: doc.id,
    title: toSafeString(data.title),
    date: toSafeString(data.date),
    category: toSafeCategory(data.category),
    summaryCard: toSafeString(data.summaryCard)
  };
}

function toIssueDetail(doc) {
  const data = doc.data();
  const issue = {
    id: doc.id,
    title: toSafeString(data.title),
    date: toSafeString(data.date),
    category: toSafeCategory(data.category),
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
