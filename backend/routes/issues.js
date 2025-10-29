// backend/routes/issues.js
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

function toTrimmedString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function ensureArrayOfStrings(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => toTrimmedString(String(item ?? ''))).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIntensity(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePerspectiveInput(view) {
  if (!view || typeof view !== 'object') {
    return undefined;
  }

  const headline = toTrimmedString(view.headline ?? '');
  const bullets = ensureArrayOfStrings(view.bullets ?? view.points);
  const note = typeof view.note === 'string' ? view.note : '';
  const intensity = normalizeIntensity(view.intensity);

  if (!headline && bullets.length === 0 && !note && intensity === undefined) {
    return undefined;
  }

  const normalized = { headline, bullets };
  if (note) {
    normalized.note = note;
  }
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }

  return normalized;
}

function normalizeImpactInput(impact) {
  if (!impact || typeof impact !== 'object') {
    return undefined;
  }
  const text = toTrimmedString(impact.text ?? '');
  const note = typeof impact.note === 'string' ? impact.note : '';

  if (!text && !note) {
    return undefined;
  }

  const normalized = { text };
  if (note) {
    normalized.note = note;
  }
  return normalized;
}

function normalizeSourcesInput(sources) {
  if (!Array.isArray(sources)) {
    return { error: 'sources 필드는 배열 형태여야 합니다.' };
  }

  const normalized = sources
    .map((source) => {
      const channelName = toTrimmedString(source?.channelName ?? '');
      if (!channelName) {
        return null;
      }

      const sourceDate = toTrimmedString(source?.sourceDate ?? '');
      const timestampRaw = source?.timestamp;
      const timestamp =
        timestampRaw === null || timestampRaw === undefined || timestampRaw === ''
          ? null
          : toTrimmedString(String(timestampRaw));

      return {
        type: SOURCE_TYPE_OPTIONS.has(source?.type) ? source.type : 'etc',
        channelName,
        sourceDate,
        timestamp,
        note: typeof source?.note === 'string' ? source.note : ''
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return { error: 'sources 배열에 최소 1개 이상의 출처를 입력해야 합니다.' };
  }

  return { sources: normalized };
}

function normalizeIssueDraftInput(body) {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 비어 있습니다.' };
  }

  const title = toTrimmedString(body.title ?? '');
  const date = toTrimmedString(body.date ?? '');
  const rawCategory = toTrimmedString(body.category ?? '');
  const category = CATEGORY_OPTIONS.has(rawCategory) ? rawCategory : '기타';
  const summaryCard = toTrimmedString(body.summaryCard ?? '');
  const background = toTrimmedString(body.background ?? '');
  const keyPoints = ensureArrayOfStrings(body.keyPoints);

  if (!title || !date || !summaryCard || !background) {
    return { error: 'title, date, summaryCard, background 필드는 필수입니다.' };
  }
  if (keyPoints.length === 0) {
    return { error: 'keyPoints 는 최소 1개 이상의 bullet 이 필요합니다.' };
  }

  const { sources, error: sourcesError } = normalizeSourcesInput(body.sources);
  if (sourcesError) {
    return { error: sourcesError };
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

  const progressiveView = normalizePerspectiveInput(body.progressiveView);
  if (progressiveView) {
    draft.progressiveView = progressiveView;
  }

  const conservativeView = normalizePerspectiveInput(body.conservativeView);
  if (conservativeView) {
    draft.conservativeView = conservativeView;
  }

  const impactToLife = normalizeImpactInput(body.impactToLife);
  if (impactToLife) {
    draft.impactToLife = impactToLife;
  }

  return { draft };
}

function normalizePerspectiveOutput(view, fallbackNote) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  const headline = toTrimmedString(view.headline ?? '');
  const bullets = ensureArrayOfStrings(view.bullets ?? view.points);
  const note = typeof view.note === 'string' && view.note ? view.note : fallbackNote;
  const intensity = normalizeIntensity(view.intensity);

  if (!headline && bullets.length === 0) {
    return null;
  }

  const normalized = { headline, bullets, note };
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }
  return normalized;
}

function normalizeImpactOutput(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }
  const text = toTrimmedString(impact.text ?? '');
  const note = typeof impact.note === 'string' && impact.note ? impact.note : IMPACT_NOTE;
  if (!text) {
    return null;
  }
  return { text, note };
}

function normalizeSourcesOutput(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources
    .map((source) => ({
      type: SOURCE_TYPE_OPTIONS.has(source?.type) ? source.type : 'etc',
      channelName: toTrimmedString(source?.channelName ?? ''),
      sourceDate: toTrimmedString(source?.sourceDate ?? ''),
      timestamp:
        source?.timestamp === null || source?.timestamp === undefined || source?.timestamp === ''
          ? null
          : toTrimmedString(String(source.timestamp)),
      note: typeof source?.note === 'string' ? source.note : ''
    }))
    .filter((source) => source.channelName);
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
    keyPoints: ensureArrayOfStrings(data.keyPoints),
    sources: normalizeSourcesOutput(data.sources),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt)
  };

  const progressiveView = normalizePerspectiveOutput(data.progressiveView, PROGRESSIVE_NOTE);
  if (progressiveView) {
    issue.progressiveView = progressiveView;
  }

  const conservativeView = normalizePerspectiveOutput(data.conservativeView, CONSERVATIVE_NOTE);
  if (conservativeView) {
    issue.conservativeView = conservativeView;
  }

  const impactToLife = normalizeImpactOutput(data.impactToLife);
  if (impactToLife) {
    issue.impactToLife = impactToLife;
  }

  return issue;
}

// TODO: 현재 검색 구현은 최근 50건을 불러와 메모리에서 필터링한다.
//       데이터가 늘어나면 Firestore 복합 색인 또는 전용 검색 인프라도입이 필요하다.
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
    // TODO: 단순 증분 방식이라 악의적 반복 호출 방어가 어렵다. 추후 rate limiting 과 인증을 강화해야 한다.
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
    // TODO: 운영 단계에서는 x-admin-secret 같은 관리자 검증을 다시 활성화하고, 더 강력한 인증 방식을 도입해야 한다.
    const { draft, error } = normalizeIssueDraftInput(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const collection = db.collection('issues');
    const docRef = collection.doc();

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
    // TODO: 운영 단계에서는 PUT 요청에도 관리자 인증과 세부 권한 검증을 추가해야 한다.
    const issueId = req.params.id;
    if (!issueId) {
      return res.status(400).json({ message: '문서 ID가 필요합니다.' });
    }

    const docRef = db.collection('issues').doc(issueId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const { draft, error } = normalizeIssueDraftInput(req.body);
    if (error) {
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
    // TODO: 운영 단계에서는 DELETE 요청을 실행하기 전에 관리자 인증을 필수로 걸어야 한다.
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
