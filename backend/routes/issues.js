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

  if (!headline && bullets.length === 0) {
    return null;
  }

  return {
    headline,
    bullets,
    note
  };
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

// TODO: 현재 검색 구현은 최근 50건을 불러와 메모리에서 필터링한다. 데이터가 늘어나면 Firestore 복합 색인 또는 전용 검색 인프라 도입이 필요하다.
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
    const adminSecretFromHeader = req.header('x-admin-secret');
    const adminSecretEnv = process.env.ADMIN_SECRET;

    // TODO: 현재는 단순 헤더 기반 비밀번호 검증만 수행한다. 실제 운영 시에는 인증 서버 혹은 OAuth 기반 보호 장치가 필요하다.
    if (!adminSecretEnv || adminSecretFromHeader !== adminSecretEnv) {
      return res.status(401).json({ message: '인증에 실패했습니다.' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: '요청 본문이 비어 있습니다.' });
    }

    const {
      id,
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
    } = req.body;

    if (!title || !date || !summaryCard || !background) {
      return res.status(400).json({ message: 'title, date, summaryCard, background 필드는 필수입니다.' });
    }

    const normalizedKeyPoints = splitLines(keyPoints);
    if (normalizedKeyPoints.length === 0) {
      return res.status(400).json({ message: 'keyPoints 는 최소 1개 이상의 bullet 이 필요합니다.' });
    }

    const normalizedSources = normalizeSources(sources);
    if (normalizedSources.length === 0) {
      return res.status(400).json({ message: 'sources 배열에 최소 1개의 출처를 입력해야 합니다.' });
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

    const normalizedProgressiveView = normalizeView(progressiveView, PROGRESSIVE_NOTE);
    const normalizedProgressiveIntensity = normalizeIntensity(progressiveIntensity);
    if (normalizedProgressiveView) {
      payload.progressiveView = normalizedProgressiveView;
    }
    if (normalizedProgressiveIntensity !== undefined) {
      payload.progressiveIntensity = normalizedProgressiveIntensity;
    }

    const normalizedConservativeView = normalizeView(conservativeView, CONSERVATIVE_NOTE);
    const normalizedConservativeIntensity = normalizeIntensity(conservativeIntensity);
    if (normalizedConservativeView) {
      payload.conservativeView = normalizedConservativeView;
    }
    if (normalizedConservativeIntensity !== undefined) {
      payload.conservativeIntensity = normalizedConservativeIntensity;
    }

    const normalizedImpact = normalizeImpact(impactToLife);
    if (normalizedImpact) {
      payload.impactToLife = normalizedImpact;
    }

    const collection = db.collection('issues');
    const docRef = id ? collection.doc(String(id)) : collection.doc();

    const timestamps = {
      updatedAt: FieldValue.serverTimestamp()
    };
    if (!id) {
      timestamps.createdAt = FieldValue.serverTimestamp();
    }

    await docRef.set({ ...payload, ...timestamps }, { merge: Boolean(id) });

    const savedDoc = await docRef.get();
    res.status(201).json({ id: docRef.id, ...savedDoc.data() });
  } catch (error) {
    console.error('POST /api/issues 오류:', error);
    res.status(500).json({ message: '이슈를 저장하는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
