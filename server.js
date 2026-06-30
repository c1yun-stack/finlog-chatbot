// 핀로그 금융 챗봇 — 간단 정적 서버 (Node + Express)
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log('FinLog 챗봇 실행 중 → http://localhost:' + PORT));
