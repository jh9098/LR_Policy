/*
  현재 프론트엔드는 Firestore Web SDK를 통해 직접
  issues 문서에 대해 create / update / delete 까지 수행한다.
  즉 이 Express 서버(Render)는 런타임에서 더 이상 사용되지 않고 있다.
  이 서버 코드는 향후 "보안 강화/권한 제어"를 위해 남겨둔 레거시 초안일 뿐이다.
  TODO(프로덕션): /admin 접근 제한 + Firestore 보안 규칙 잠그기 + 이 서버에서만 쓰기 허용하는 구조로 전환해야 한다.
*/

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const issuesRouter = require('./routes/issues');

const app = express();

// CORS 정책: 과거 Render/Netlify 배포용 설정이다. 현재는 서버가 비활성 상태이지만, 보안 강화 시 재사용할 수 있도록 남겨둔다.
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://lrissues.netlify.app',
  'https://www.lrissues.netlify.app',
  'https://lr-policy.onrender.com',
  'https://infoall.netlify.app',
  'https://www.infoall.netlify.app'
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
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
  res.json({ message: 'LR Policy 백엔드 API (레거시)입니다. 현재 프론트는 Firestore를 직접 사용합니다.' });
});

// !!! 주의 !!!
// 지금은 프런트가 Firestore Web SDK를 통해 바로 CRUD를 수행하므로, 아래 라우트는 운영 경로에서 사용되지 않는다.
app.use('/api/issues', issuesRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 0.0.0.0:${PORT}에서 실행 중입니다. (현재는 레거시 대기 상태)`);
});
