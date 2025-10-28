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

function normalizeFrame(frame, fallbackNote) {
  if (!frame || typeof frame !== 'object') {
    return {
      headline: '',
      points: [],
      note: fallbackNote
    };
  }

  const points = ensureArray(frame.points ?? frame.items ?? frame.list);

  return {
    headline: frame.headline ? String(frame.headline) : '',
    points,
    note: frame.note ? String(frame.note) : fallbackNote
  };
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
