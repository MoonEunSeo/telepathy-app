const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
console.log('✅ authRoutes:', authRoutes);
const verifyRoutes = require('./routes/verify.routes');
const verifyMvpRoutes = require('./routes/verify-mvp.routes');
const matchRoutes = require('./routes/match.routes');
const registerRoutes = require('./routes/register.routes');
const passwordRoutes = require('./routes/password.routes');
const nicknameRoutes = require('./routes/nickname.routes');
const withdrawRoutes = require('./routes/withdraw.routes');
const balanceGameRoutes = require('./routes/balanceGame.routes');

const app = express();

// ✅ CORS 설정을 환경변수로 변경
const CLIENT_ORIGIN = process.env.REALSITE || 'http://localhost:5179';
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

// API 라우팅 연결
app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verify-mvp', verifyMvpRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/nickname', nicknameRoutes);  // 위치는 여기도 OK (CORS는 전역 적용됨)
app.use('/api/auth/withdraw', withdrawRoutes);
app.use('/api/balance-game', balanceGameRoutes);

app.get('/', (req, res) => {
  res.send('텔레파시 서버 작동 중...');
});

module.exports = app;
