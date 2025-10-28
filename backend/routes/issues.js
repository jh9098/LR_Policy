const express = require('express');
const { db, FieldValue } = require('../firebaseAdmin');

const router = express.Router();

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
        title: data.title,
        date: data.date,
        summary: data.summary
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

// TODO: 여기 추후 인증 필요
router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: '요청 본문에 JSON 객체가 필요합니다.' });
    }

    const incomingData = { ...req.body };
    const collection = db.collection('issues');

    let docRef;
    if (incomingData.id) {
      docRef = collection.doc(incomingData.id);
      await docRef.set({
        ...incomingData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      const doc = await collection.add({
        ...incomingData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      docRef = doc;
    }

    const savedDoc = await docRef.get();

    res.status(201).json({ id: docRef.id, ...savedDoc.data() });
  } catch (error) {
    console.error('POST /api/issues 오류:', error);
    res.status(500).json({ message: '이슈를 저장하는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
