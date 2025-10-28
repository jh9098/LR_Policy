require('dotenv').config();

const express = require('express');
const cors = require('cors');

const issuesRouter = require('./routes/issues');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'LR Policy 백엔드 API가 정상 동작 중입니다.' });
});

app.use('/api/issues', issuesRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 0.0.0.0:${PORT}에서 실행 중입니다.`);
});
