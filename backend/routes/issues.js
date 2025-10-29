// backend/routes/issues.js
const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수적 시각 채널/논객의 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

function toSafeString(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function splitLines(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSafeString(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
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

function normalizeView(view, fallbackNote) {
  if (!view || typeof view !== 'object') {
    return null;
  }

  const headline = view.headline ? toSafeString(view.headline) : '';
  const bullets = splitLines(view.bullets ?? view.points);
  const note = view.note ? toSafeString(view.note) : fallbackNote;
  const intensity = normalizeIntensity(view.intensity ?? view.progressiveIntensity ?? view.conservativeIntensity);

  if (!headline && bullets.length === 0) {
    return null;
  }

  const normalized = { headline, bullets, note };
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }
  return normalized;
}

function normalizeImpact(impact) {
  if (!impact || typeof impact !== 'object') {
    return null;
  }

  const text = impact.text ? toSafeString(impact.text) : '';
  const note = impact.note ? toSafeString(impact.note) : IMPACT_NOTE;

  if (!text) {
    return null;
  }

  return { text, note };
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source) => {
      const channelName = toSafeString(source.channelName ?? '');
      if (!channelName) {
        return null;
      }

      const timestampRaw = source.timestamp ?? null;
      let timestamp = null;
      if (timestampRaw !== null && timestampRaw !== undefined && timestampRaw !== '') {
        timestamp = toSafeString(timestampRaw);
      }

      return {
        type: toSafeString(source.type ?? 'etc') || 'etc',
        channelName,
        sourceDate: source.sourceDate ? toSafeString(source.sourceDate) : '',
        timestamp,
        note: source.note ? toSafeString(source.note) : ''
      };
    })
    .filter(Boolean);
}

function buildIssuePayload(body) {
  if (!body || typeof body !== 'object') {
    return { error: '요청 본문이 비어 있습니다.' };
  }

  const {
    title,
    date,
    category,
    summaryCard,
    background,
    keyPoints,
    progressiveView,
    progressiveIntensity,
    conservativeView,
    conservativeIntensity,
    impactToLife,
    sources
  } = body;

  if (!title || !date || !summaryCard || !background) {
    return { error: 'title, date, summaryCard, background 필드는 필수입니다.' };
  }

  const normalizedKeyPoints = splitLines(keyPoints);
  if (normalizedKeyPoints.length === 0) {
    return { error: 'keyPoints 는 최소 1개 이상의 bullet 이 필요합니다.' };
  }

  const normalizedSources = normalizeSources(sources);
  if (normalizedSources.length === 0) {
    return { error: 'sources 배열에 최소 1개의 출처를 입력해야 합니다.' };
  }

  const payload = {
    title: toSafeString(title),
    date: toSafeString(date),
    category: category ? toSafeString(category) : '기타',
    summaryCard: toSafeString(summaryCard),
    background: toSafeString(background),
    keyPoints: normalizedKeyPoints,
    sources: normalizedSources
  };

  const normalizedProgressiveView = normalizeView(
    progressiveView
      ? {
          ...progressiveView,
          intensity:
            progressiveView.intensity !== undefined ? progressiveView.intensity : progressiveIntensity
        }
      : null,
    PROGRESSIVE_NOTE
  );
  if (normalizedProgressiveView) {
    payload.progressiveView = normalizedProgressiveView;
  }

  const normalizedConservativeView = normalizeView(
    conservativeView
      ? {
          ...conservativeView,
          intensity:
            conservativeView.intensity !== undefined ? conservativeView.intensity : conservativeIntensity
        }
      : null,
    CONSERVATIVE_NOTE
  );
  if (normalizedConservativeView) {
    payload.conservativeView = normalizedConservativeView;
  }

  const normalizedImpact = normalizeImpact(impactToLife);
  if (normalizedImpact) {
    payload.impactToLife = normalizedImpact;
  }

  return { payload };
}

// TODO: 현재 검색 구현은 최근 50건을 불러와 메모리에서 필터링한다. 데이터가 늘어나면 Firestore 복합 색인 또는 전용 검색 인프라도입이 필요하다.
router.get('/search', async (req, res) => {
  try {
    const { category, query } = req.query;

    const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').limit(50).get();

    const categoryFilter = typeof category === 'string' ? category.trim() : '';
    const keyword = typeof query === 'string' ? query.trim().toLowerCase() : '';

    const issues = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          date: data.date || '',
          category: data.category || '기타',
          summaryCard: data.summaryCard || ''
        };
      })
      .filter((issue) => {
        const matchCategory = !categoryFilter || issue.category === categoryFilter;
        if (!keyword) {
          return matchCategory;
        }
        return (
          matchCategory &&
          (issue.title.toLowerCase().includes(keyword) || issue.summaryCard.toLowerCase().includes(keyword))
        );
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
    const issues = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        date: data.date || '',
        category: data.category || '기타',
        summaryCard: data.summaryCard || ''
      };
    });

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

    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error(`GET /api/issues/${req.params.id} 오류:`, error);
    res.status(500).json({ message: '이슈를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    // TODO: 운영 단계에서는 x-admin-secret 같은 관리자 검증을 다시 활성화하고, 더 강력한 인증 방식을 도입해야 한다.
    const { payload, error } = buildIssuePayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const collection = db.collection('issues');
    const docRef = collection.doc();

    await docRef.set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: false }
    );

    const savedDoc = await docRef.get();
    res.status(201).json({ id: docRef.id, ...savedDoc.data() });
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

    const { payload, error } = buildIssuePayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    await docRef.set(
      {
        ...payload,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: false }
    );

    const updatedDoc = await docRef.get();
    res.json({ id: docRef.id, ...updatedDoc.data() });
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
