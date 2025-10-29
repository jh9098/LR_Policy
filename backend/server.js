// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const issuesRouter = require('./routes/issues');

const app = express();

// CORS 정책: 기본 허용 도메인 + 환경 변수(ALLOWED_ORIGINS)로 전달된 도메인을 모두 허용한다.
// Render나 Netlify 배포 환경에서는 Origin 값이 정확히 일치해야 하므로, 공백을 제거해 비교한다.
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://lrissues.netlify.app',
  'https://www.lrissues.netlify.app',
  'https://lr-policy.onrender.com'
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      // 서버 간 통신 또는 테스트 환경에서는 Origin 헤더가 없을 수 있다.
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] 허용되지 않은 Origin 요청 차단: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret'],
  credentials: false,
  optionsSuccessStatus: 200
};

app.use((req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS 정책에 의해 차단된 요청입니다.' });
  }
  return next(err);
});
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'LR Policy 백엔드 API가 정상 동작 중입니다.' });
});

app.use('/api/issues', issuesRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 0.0.0.0:${PORT}에서 실행 중입니다.`);
});
