// backend/routes/issues.js
const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|\r|\u2028/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIntensity(rawIntensity) {
  // 프레임 강도는 0~100 범위의 숫자로 관리한다. 숫자가 없으면 undefined 로 남겨 저장하지 않는다.
  if (rawIntensity === null || rawIntensity === undefined) {
    return undefined;
  }

  const parsed = Number(rawIntensity);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function normalizeFrame(frame, fallbackNote) {
  if (!frame || typeof frame !== 'object') {
    return {
      headline: '',
      points: [],
      note: fallbackNote,
      // intensity 는 선택 항목이라 없는 경우에는 저장하지 않는다.
    };
  }

  const points = ensureArray(frame.points ?? frame.items ?? frame.list);
  const normalized = {
    headline: frame.headline ? String(frame.headline) : '',
    points,
    note: frame.note ? String(frame.note) : fallbackNote
  };

  const intensity = normalizeIntensity(frame.intensity);
  if (intensity !== undefined) {
    normalized.intensity = intensity;
  }

  return normalized;
}

function normalizeImpact(impact) {
  if (!impact || typeof impact !== 'object') {
    return {
      text: '',
      points: []
    };
  }

  return {
    text: impact.text ? String(impact.text) : '',
    points: ensureArray(impact.points ?? impact.list)
  };
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source) => ({
      type: source?.type ? String(source.type) : '기타',
      channelName: source?.channelName ? String(source.channelName) : '',
      videoDate: source?.videoDate ? String(source.videoDate) : '',
      timestamp: source?.timestamp ? String(source.timestamp) : '',
      note: source?.note ? String(source.note) : ''
    }))
    .filter((item) => item.channelName);
}

// TODO: 현재 검색 API 는 Firestore 의 복합 인덱스를 적극 활용하지 않고, 최근 문서 50개를 불러온 뒤 메모리에서 추가 필터링한다.
//       MVP 단계라 허용하지만, 향후 데이터가 증가하면 Firestore 의 정교한 쿼리/Algolia 같은 검색 인프라 도입이 필요하다.
router.get('/search', async (req, res) => {
  try {
    const { category, query } = req.query;

    const snapshot = await db
      .collection('issues')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const keyword = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const categoryFilter = typeof category === 'string' ? category.trim() : '';

    const filtered = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          date: data.date || '',
          summary: data.summary || '',
          category: data.category || '기타'
        };
      })
      .filter((issue) => {
        const matchCategory = !categoryFilter || issue.category === categoryFilter;

        if (!keyword) {
          return matchCategory;
        }

        const combined = `${issue.title} ${issue.summary}`.toLowerCase();
        const matchKeyword = combined.includes(keyword);
        return matchCategory && matchKeyword;
      })
      .slice(0, 20);

    res.json(filtered);
  } catch (error) {
    console.error('GET /api/issues/search 오류:', error);
    res
      .status(500)
      .json({ message: '이슈를 검색하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const snapshot = await db
      .collection('issues')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const issues = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        date: data.date || '',
        summary: data.summary || '',
        category: data.category || '기타'
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
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '해당 ID의 이슈를 찾을 수 없습니다.' });
    }

    const metricsRef = db.collection('metrics').doc(doc.id);
    // TODO: 현재는 단순 증가 방식이라 악성 반복 호출에 취약하다. 추후 rate limiting 과 인증 보강이 필수다.
    await metricsRef.set(
      {
        views: FieldValue.increment ? FieldValue.increment(1) : 1,
        lastViewedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // Firestore 문서 구조 주석:
    // - progressiveFrame.intensity, conservativeFrame.intensity 는 선택 필드로 0~100 사이 값만 저장한다.
    // - metrics 컬렉션은 issueId 를 키로 { views, lastViewedAt } 를 저장한다.
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`GET /api/issues/${req.params.id} 오류:`, error);
    res.status(500).json({ message: '이슈를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: '요청 본문에 JSON 객체가 필요합니다.' });
    }

    // TODO: production 환경에서는 x-admin-secret 헤더를 검사하여 관리자만 등록 가능하도록 보호한다.

    const {
      id,
      title,
      date,
      category,
      summary,
      summaryFacts,
      progressiveFrame,
      conservativeFrame,
      impactToLife,
      sources
    } = req.body;

    if (!title || !date || !summary || !category) {
      return res.status(400).json({ message: 'title, date, summary, category 필드는 필수입니다.' });
    }

    const payload = {
      title: String(title),
      date: String(date),
      category: String(category),
      summary: String(summary),
      summaryFacts: ensureArray(summaryFacts),
      progressiveFrame: normalizeFrame(
        progressiveFrame,
        '이 내용은 진보 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
      ),
      conservativeFrame: normalizeFrame(
        conservativeFrame,
        '이 내용은 보수 성향 채널들의 주장/전망이며, 확실하지 않은 사실일 수 있음'
      ),
      impactToLife: normalizeImpact(impactToLife),
      sources: normalizeSources(sources),
      updatedAt: FieldValue.serverTimestamp()
    };

    const collection = db.collection('issues');
    let docRef;

    if (id) {
      docRef = collection.doc(String(id));
      await docRef.set(payload, { merge: true });
    } else {
      docRef = await collection.add({
        ...payload,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    const savedDoc = await docRef.get();

    res.status(201).json({ id: docRef.id, ...savedDoc.data() });
  } catch (error) {
    console.error('POST /api/issues 오류:', error);
    res.status(500).json({ message: '이슈를 저장하는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
