
// 📦 routes/match.routes.js
/*const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 이 예제에서는 메모리에 단어 세션을 보관합니다. (배포 시엔 Redis 등으로 대체 추천)
let activeSessions = {}; // { word: [timestamp1, timestamp2, ...] }
const MAX_SESSION_DURATION = 5 * 60 * 1000; // 5분

// ✅ 단어 등록 및 타이머 시작 (클라이언트가 단어 선택 시 호출)
router.post('/start', (req, res) => {
  const { word } = req.body;
  const now = Date.now();

  if (!word) return res.status(400).json({ error: '단어 누락' });

  // 세션이 없으면 초기화
  if (!activeSessions[word]) activeSessions[word] = [];

  // 현재 세션에 시간 추가
  activeSessions[word].push(now);

  // 5분 이상 지난 세션 제거
  activeSessions[word] = activeSessions[word].filter(
    (timestamp) => now - timestamp < MAX_SESSION_DURATION
  );

  res.json({ success: true });
});


router.post('/check', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;

  console.log('✅ 매칭 확인 요청:', word);

  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    // 1️⃣ 유저 인증 정보 디코드
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.user_id;
    const senderNickname = decoded.username;

    console.log('✅ senderId:', senderId, 'senderNickname:', senderNickname);

    // 2️⃣ 매칭 로직 (임시 → 추후 진짜 매칭 시스템 구현 필요)
    const matched = true; // (임시로 true → 진짜로는 매칭 테이블 참조 필요)

    if (matched) {
      const roomId = 'room123'; // 임시 roomId → 진짜 로직 구성 필요

      // **여기만 기존과 다르게 receiverId는 "진짜 유저 id" 사용!**
      const receiverId = '29c57e13-a67b-4f4f-a46d-d999fe4a53ed'; // 예시 → 추후 동적 매칭 결과에서 받아오기

      // 3️⃣ receiverNickname → 유저 테이블에서 조회
      const { data: receiverUser, error: receiverError } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', receiverId)
        .maybeSingle();

      if (receiverError || !receiverUser) {
        console.error('[매칭 응답 오류] 리시버 정보 조회 실패:', receiverError);
        return res.status(500).json({ success: false, message: '리시버 조회 실패' });
      }

      const receiverNickname = receiverUser.nickname;

      // 4️⃣ 응답 반환
      return res.json({
        matched: true,
        roomId,
        senderId,
        senderNickname,
        receiverId,
        receiverNickname,
        word, // word 그대로 사용
      });
    } else {
      return res.json({ matched: false });
    }
  } catch (err) {
    console.error('[매칭 확인 오류]', err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }

  // 유효한 타임스탬프만 필터링
  activeSessions[word] = activeSessions[word].filter(
    (t) => now - t < MAX_SESSION_DURATION
  );

  const isMatched = activeSessions[word].length >= 2;
  return res.json({ matched: isMatched });
});

module.exports = router;*/


// 📦 routes/match.routes.js2

// 📦 routes/match.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let queue = {}; // { word: [ { userId, nickname, timestamp } ] }
let activeMatches = {}; // { word: { userId: { roomId, receiverId, receiverNickname } } }
const MAX_SESSION_DURATION = 5 * 60 * 1000; // 5분

// ✅ 단어 등록 API
router.post('/start', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;
  const now = Date.now();

  if (!word) return res.status(400).json({ error: '단어 누락' });
  if (!token) return res.status(401).json({ error: '인증 필요' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    await supabase
      .from('telepathy_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('word', word);

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ error: '닉네임 조회 실패' });
    }

    const nickname = userProfile.nickname;

    await supabase
      .from('telepathy_sessions')
      .insert({ user_id: userId, word, status: 'waiting' });

    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== userId);
    queue[word].push({ userId, nickname, timestamp: now });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 매칭 확인 API
router.post('/check', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;
  if (!token) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.user_id;

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', senderId)
      .single();

    if (error || !userProfile) return res.status(500).json({ success: false, message: '닉네임 조회 실패' });

    const senderNickname = userProfile.nickname;
    const now = Date.now();

    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== senderId);
    queue[word].push({ userId: senderId, nickname: senderNickname, timestamp: now });

    await supabase
      .from('telepathy_sessions')
      .insert({ word, user_id: senderId, status: 'waiting' }, { onConflict: ['word', 'user_id'] });

    if (activeMatches[word]?.[senderId]) {
      const match = activeMatches[word][senderId];
      return res.json({ matched: true, roomId: match.roomId, senderId, senderNickname, receiverId: match.receiverId, receiverNickname: match.receiverNickname, word });
    }

    if (queue[word].length >= 2) {
      const user1 = queue[word].shift();
      const user2 = queue[word].shift();
      const roomId = uuidv4();

      activeMatches[word] = {
        [user1.userId]: { roomId, receiverId: user2.userId, receiverNickname: user2.nickname },
        [user2.userId]: { roomId, receiverId: user1.userId, receiverNickname: user1.nickname },
      };

      await supabase.from('telepathy_sessions').insert([
        { word, user_id: user1.userId, status: 'matched', matched_user_id: user2.userId, room_id: roomId },
        { word, user_id: user2.userId, status: 'matched', matched_user_id: user1.userId, room_id: roomId },
      ], { onConflict: ['word', 'user_id'] });

      let receiverId, receiverNickname;
      if (senderId === user1.userId) {
        receiverId = user2.userId;
        receiverNickname = user2.nickname;
      } else {
        receiverId = user1.userId;
        receiverNickname = user1.nickname;
      }

      return res.json({ matched: true, roomId, senderId, senderNickname, receiverId, receiverNickname, word });
    } else {
      return res.json({ matched: false });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 세션 종료 API
router.post('/end', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;
  if (!token || !word) return res.status(400).json({ success: false, message: '필수 정보 누락' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    await supabase
      .from('telepathy_sessions')
      .update({ status: 'ended' })
      .match({ word, user_id: userId });

    res.status(200).json({ success: true, message: '세션 종료' });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 세션 상태 확인 API
router.post('/session-status', async (req, res) => {
  const { word, userId } = req.body;
  if (!word || !userId) return res.status(400).json({ active: false, message: '필수 정보 누락' });

  try {
    const { data, error } = await supabase
      .from('telepathy_sessions')
      .select('status')
      .eq('word', word)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.json({ active: false });

    const active = data.status === 'matched' || data.status === 'waiting';
    res.json({ active });
  } catch (err) {
    res.status(500).json({ active: false });
  }
});

module.exports = router;
/*
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 글로벌 상태 관리
let queue = {}; // { word: [ { userId, nickname, timestamp } ] }
let activeMatches = {}; // { word: { userId: { roomId, receiverId, receiverNickname } } }
const MAX_SESSION_DURATION = 5 * 60 * 1000; // 5분

// ✅ 단어 등록 API
router.post('/start', (req, res) => {
  const { word } = req.body;
  const now = Date.now();

  if (!word) return res.status(400).json({ error: '단어 누락' });

  if (!queue[word]) queue[word] = [];

  // 오래된 항목 제거
  queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);

  res.json({ success: true });
});

// ✅ 매칭 확인 API
router.post('/check', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;

  console.log('\n✅ 매칭 확인 요청:', word);

  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.user_id;

    // 닉네임 Supabase에서 조회
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', senderId)
      .single();

    if (error || !userProfile) {
      console.error('❌ 닉네임 조회 실패:', error);
      return res.status(500).json({ success: false, message: '닉네임 조회 실패' });
    }

    const senderNickname = userProfile.nickname;
    console.log('✅ senderId:', senderId, 'senderNickname:', senderNickname);

    // 기존 매칭 유지
    if (activeMatches[word] && activeMatches[word][senderId]) {
      const matchInfo = activeMatches[word][senderId];
      console.log(`🎉 [기존 매칭 유지] senderId=${senderId}, roomId=${matchInfo.roomId}`);

      return res.json({
        matched: true,
        roomId: matchInfo.roomId,
        senderId,
        senderNickname,
        receiverId: matchInfo.receiverId,
        receiverNickname: matchInfo.receiverNickname,
        word
      });
    }

    // 대기열 초기화 및 정리
    if (!queue[word]) queue[word] = [];

    const now = Date.now();
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== senderId);

    // 현재 유저 큐에 추가
    queue[word].push({ userId: senderId, nickname: senderNickname, timestamp: now });

    console.log('⏳ 대기중 word=' + word + ', queue=', queue[word].map(u => u.nickname));

    // 매칭 시도
    if (queue[word].length >= 2) {
      const user1 = queue[word].shift();
      const user2 = queue[word].shift();
      const roomId = uuidv4();

      // 매칭 정보 저장
      activeMatches[word] = activeMatches[word] || {};
      activeMatches[word][user1.userId] = {
        roomId,
        receiverId: user2.userId,
        receiverNickname: user2.nickname
      };
      activeMatches[word][user2.userId] = {
        roomId,
        receiverId: user1.userId,
        receiverNickname: user1.nickname
      };

      console.log(`🎉 매칭 성공: [${user1.nickname}] <-> [${user2.nickname}] roomId=${roomId}`);

      const isSenderUser1 = senderId === user1.userId;

      return res.json({
        matched: true,
        roomId,
        senderId,
        senderNickname,
        receiverId: isSenderUser1 ? user2.userId : user1.userId,
        receiverNickname: isSenderUser1 ? user2.nickname : user1.nickname,
        word
      });
    } else {
      return res.json({ matched: false });
    }

  } catch (err) {
    console.error('[매칭 확인 오류]', err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;*/