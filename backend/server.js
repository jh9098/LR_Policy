// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const issuesRouter = require('./routes/issues');

const app = express();

// CORS 정책: 로컬 개발 도메인과 실제 배포 도메인(Netlify)을 명시적으로 허용한다.
const corsOptions = {
  origin: ['http://localhost:5173', 'https://your-netlify-domain.netlify.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'LR Policy 백엔드 API가 정상 동작 중입니다.' });
});

app.use('/api/issues', issuesRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 0.0.0.0:${PORT}에서 실행 중입니다.`);
});
