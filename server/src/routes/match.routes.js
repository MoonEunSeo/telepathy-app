/*
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

let queue = {}; // { word: [ { userId, username, nickname, timestamp } ] }
let activeMatches = {}; // { word: { userId: { roomId, receiverId, receiverNickname, receiverUsername } } }
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
      .select('nickname, username')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ error: '프로필 조회 실패' });
    }

    const { nickname, username } = userProfile;

    await supabase
      .from('telepathy_sessions')
      .insert({ user_id: userId, username, nickname, word, status: 'waiting' });

    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== userId);
    queue[word].push({ userId, username, nickname, timestamp: now });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ /start 오류:', err);
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
      .select('nickname, username') // ✅ username 추가
      .eq('id', senderId)
      .single();

    if (error || !userProfile) return res.status(500).json({ success: false, message: '프로필 조회 실패' });

    const { nickname: senderNickname, username: senderUsername } = userProfile;
    const now = Date.now();

    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== senderId);
    queue[word].push({ userId: senderId, username: senderUsername, nickname: senderNickname, timestamp: now });

    await supabase
      .from('telepathy_sessions')
      .insert({ word, user_id: senderId, status: 'waiting' }, { onConflict: ['word', 'user_id'] });

    if (activeMatches[word]?.[senderId]) {
      const match = activeMatches[word][senderId];
      return res.json({
        matched: true,
        roomId: match.roomId,
        senderId,
        senderUsername,
        senderNickname,
        receiverId: match.receiverId,
        receiverUsername: match.receiverUsername, // ✅ 추가
        receiverNickname: match.receiverNickname,
        word
      });
    }

    if (queue[word].length >= 2) {
      const user1 = queue[word].shift();
      const user2 = queue[word].shift();
      const roomId = uuidv4();

      activeMatches[word] = {
        [user1.userId]: {
          roomId,
          receiverId: user2.userId,
          receiverNickname: user2.nickname,
          receiverUsername: user2.username // ✅ 추가
        },
        [user2.userId]: {
          roomId,
          receiverId: user1.userId,
          receiverNickname: user1.nickname,
          receiverUsername: user1.username // ✅ 추가
        }
      };

      await supabase.from('telepathy_sessions').insert([
        { word, user_id: user1.userId, status: 'matched', matched_user_id: user2.userId, room_id: roomId },
        { word, user_id: user2.userId, status: 'matched', matched_user_id: user1.userId, room_id: roomId }
      ], { onConflict: ['word', 'user_id'] });

      let receiverId, receiverNickname, receiverUsername;
      if (senderId === user1.userId) {
        receiverId = user2.userId;
        receiverNickname = user2.nickname;
        receiverUsername = user2.username;
      } else {
        receiverId = user1.userId;
        receiverNickname = user1.nickname;
        receiverUsername = user1.username;
      }

      return res.json({
        matched: true,
        roomId,
        senderId,
        senderUsername,
        senderNickname,
        receiverId,
        receiverUsername,
        receiverNickname,
        word
      });
    } else {
      return res.json({ matched: false });
    }
  } catch (err) {
    console.error('❌ /check 오류:', err);
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
    console.error('❌ /end 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 세션 상태 확인 API
router.post('/session-status', async (req, res) => {
  const { word, userId } = req.body;
  if (!word || !userId) return res.status(400).json({ active: false, message: '필수 정보 누락' });

  try {
    // 1. 내 세션 정보 가져오기
    const { data: sessionData, error: sessionError } = await supabase
      .from('telepathy_sessions')
      .select('status, matched_user_id')
      .eq('word', word)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !sessionData) return res.json({ active: false });

    const active = sessionData.status === 'matched' || sessionData.status === 'waiting';
    const matchedUserId = sessionData.matched_user_id;

    // 2. 내 프로필 정보 가져오기
    const { data: myProfile, error: myError } = await supabase
      .from('users')
      .select('username, nickname')
      .eq('id', userId)
      .single();

    if (myError || !myProfile) return res.json({ active });

    let matchedProfile = null;

    // 3. 매칭된 상대 프로필도 가져오기
    if (matchedUserId) {
      const { data: matchedUser, error: matchedError } = await supabase
        .from('users')
        .select('username, nickname')
        .eq('id', matchedUserId)
        .single();

      if (!matchedError && matchedUser) {
        matchedProfile = matchedUser;
      }
    }

    return res.json({
      active,
      status: sessionData.status,
      myUsername: myProfile.username,
      myNickname: myProfile.nickname,
      matchedUsername: matchedProfile ? matchedProfile.username : null,
      matchedNickname: matchedProfile ? matchedProfile.nickname : null
    });
  } catch (err) {
    console.error('❌ /session-status 오류:', err);
    res.status(500).json({ active: false });
  }
});
module.exports = router;
*/
/*
// 📦 routes/match.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// ✅ Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 전역 상태 - 단어 대기열과 매칭 상태 저장용
let queue = {}; // { word: [ { userId, username, nickname, timestamp } ] }
let activeMatches = {}; // { word: { userId: { roomId, receiverId, receiverNickname, receiverUsername } } }

const MAX_SESSION_DURATION = 5 * 60 * 1000; // 5분 세션 유지 시간

// ✅ 1. 단어 등록 API
router.post('/start', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;
  const now = Date.now();

  if (!word) return res.status(400).json({ error: '단어 누락' });
  if (!token) return res.status(401).json({ error: '인증 필요' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    // ✅ 같은 단어에 대해 이전 세션 삭제
    await supabase
      .from('telepathy_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('word', word);

    // ✅ 유저 정보 조회
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('nickname, username')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ error: '프로필 조회 실패' });
    }

    const { nickname, username } = userProfile;

    // ✅ 세션 DB 저장 (대기 상태)
    await supabase
      .from('telepathy_sessions')
      .insert({ user_id: userId, username, nickname, word, status: 'waiting' });

    // ✅ 대기열 최신화
    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== userId);
    queue[word].push({ userId, username, nickname, timestamp: now });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ /start 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 2. 매칭 확인 API
router.post('/check', async (req, res) => {
  const token = req.cookies.token;
  const { word } = req.body;
  if (!token) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.user_id;

    // ✅ 유저 정보 조회
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('nickname, username')
      .eq('id', senderId)
      .single();

    if (error || !userProfile) return res.status(500).json({ success: false, message: '프로필 조회 실패' });

    const { nickname: senderNickname, username: senderUsername } = userProfile;
    const now = Date.now();

    // ✅ 대기열 최신화 (중복 방지 및 5분 이내 유지)
    if (!queue[word]) queue[word] = [];
    queue[word] = queue[word].filter(entry => now - entry.timestamp < MAX_SESSION_DURATION);
    queue[word] = queue[word].filter(entry => entry.userId !== senderId);
    queue[word].push({ userId: senderId, username: senderUsername, nickname: senderNickname, timestamp: now });

    // ✅ DB에도 대기 상태 저장 (중복 방지)
    await supabase
      .from('telepathy_sessions')
      .insert({ word, user_id: senderId, status: 'waiting' }, { onConflict: ['word', 'user_id'] });

    // ✅ 이미 매칭된 경우 빠르게 리턴
    if (activeMatches[word]?.[senderId]) {
      const match = activeMatches[word][senderId];
      return res.json({
        matched: true,
        roomId: match.roomId,
        senderId,
        senderUsername,
        senderNickname,
        receiverId: match.receiverId,
        receiverUsername: match.receiverUsername,
        receiverNickname: match.receiverNickname,
        word
      });
    }

    // ✅ 새로운 매칭 시도
    if (queue[word].length >= 2) {
      const user1 = queue[word].shift();
      const user2 = queue[word].shift();
      const roomId = uuidv4();

      // ✅ 메모리에 매칭 저장
      activeMatches[word] = {
        [user1.userId]: {
          roomId,
          receiverId: user2.userId,
          receiverNickname: user2.nickname,
          receiverUsername: user2.username
        },
        [user2.userId]: {
          roomId,
          receiverId: user1.userId,
          receiverNickname: user1.nickname,
          receiverUsername: user1.username
        }
      };

      // ✅ DB에 양쪽 모두 매칭 상태로 저장 (🔥 여기가 핵심 수정)
      await supabase.from('telepathy_sessions').insert([
        {
          word,
          user_id: user1.userId,
          username: user1.username,
          nickname: user1.nickname,
          status: 'matched',
          matched_user_id: user2.userId,
          matched_username: user2.username,
          matched_nickname: user2.nickname,
          room_id: roomId
        },
        {
          word,
          user_id: user2.userId,
          username: user2.username,
          nickname: user2.nickname,
          status: 'matched',
          matched_user_id: user1.userId,
          matched_username: user1.username,
          matched_nickname: user1.nickname,
          room_id: roomId
        }
      ], { onConflict: ['word', 'user_id'] });

      // ✅ 매칭 성공 결과 반환
      let receiverId, receiverNickname, receiverUsername;
      if (senderId === user1.userId) {
        receiverId = user2.userId;
        receiverNickname = user2.nickname;
        receiverUsername = user2.username;
      } else {
        receiverId = user1.userId;
        receiverNickname = user1.nickname;
        receiverUsername = user1.username;
      }

      return res.json({
        matched: true,
        roomId,
        senderId,
        senderUsername,
        senderNickname,
        receiverId,
        receiverUsername,
        receiverNickname,
        word
      });
    } else {
      return res.json({ matched: false });
    }
  } catch (err) {
    console.error('❌ /check 오류:', err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 3. 세션 종료 API
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
    console.error('❌ /end 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 4. 세션 상태 확인 API
router.post('/session-status', async (req, res) => {
  const { word, userId } = req.body;
  if (!word || !userId) return res.status(400).json({ active: false, message: '필수 정보 누락' });

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('telepathy_sessions')
      .select('status, matched_user_id')
      .eq('word', word)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !sessionData) return res.json({ active: false });

    const active = sessionData.status === 'matched' || sessionData.status === 'waiting';
    const matchedUserId = sessionData.matched_user_id;

    // 🔁 참고: 아래 유저 프로필 조회 코드는 위 API들에서도 공통되므로 유틸 함수화 가능함

    const { data: myProfile, error: myError } = await supabase
      .from('users')
      .select('username, nickname')
      .eq('id', userId)
      .single();

    if (myError || !myProfile) return res.json({ active });

    let matchedProfile = null;

    if (matchedUserId) {
      const { data: matchedUser, error: matchedError } = await supabase
        .from('users')
        .select('username, nickname')
        .eq('id', matchedUserId)
        .single();

      if (!matchedError && matchedUser) {
        matchedProfile = matchedUser;
      }
    }

    return res.json({
      active,
      status: sessionData.status,
      myUsername: myProfile.username,
      myNickname: myProfile.nickname,
      matchedUsername: matchedProfile ? matchedProfile.username : null,
      matchedNickname: matchedProfile ? matchedProfile.nickname : null
    });
  } catch (err) {
    console.error('❌ /session-status 오류:', err);
    res.status(500).json({ active: false });
  }
});

module.exports = router;*/
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { getCurrentRound } = require('../utils/round');
require('dotenv').config();

// ✅ Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 0. 현재 라운드 API (이제 단어세트는 프론트에서 처리)
router.get('/current-round', (req, res) => {
  const { round, remaining } = getCurrentRound();
  res.json({ round, remaining });
});

// ✅ 1. 단어 등록 (큐에 대기열 upsert)
router.post('/start', async (req, res) => {
  const token = req.cookies.token;
  const { word, round } = req.body;

  if (!word || !round) return res.status(400).json({ error: '단어 또는 라운드 누락' });
  if (!token) return res.status(401).json({ error: '인증 필요' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    // 유저 프로필 조회
    const { data: profile } = await supabase
      .from('users')
      .select('username, nickname')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(500).json({ error: '프로필 조회 실패' });

    // upsert 사용 → (user_id, round) 고유키 충돌시 update
    const { error } = await supabase
      .from('telepathy_sessions_queue')
      .upsert([{
        user_id: userId,
        username: profile.username,
        nickname: profile.nickname,
        word,
        round,
        status: 'waiting',
        room_id: null,
        partner_id: null,
        partner_username: null,
        partner_nickname: null,
      }], { onConflict: ['round', 'user_id'] });

    if (error) {
      console.error("❌ /start upsert 오류:", error.message);
      return res.status(500).json({ success: false, message: 'DB 오류' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ /start 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 2. 매칭 확인
router.post('/check', async (req, res) => {
  const token = req.cookies.token;
  const { word, round } = req.body;

  if (!token) return res.status(401).json({ success: false, message: '로그인 필요' });
  if (!word || !round) return res.status(400).json({ success: false, message: '단어/라운드 누락' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    // 내 세션 조회
    const { data: mySession } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('round', round)
      .single();

    if (mySession && mySession.status === 'matched' && mySession.room_id) {
      return res.json({ matched: true, ...mySession });
    }

    // 후보자 검색
    const { data: candidates } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('word', word)
      .eq('round', round)
      .eq('status', 'waiting')
      .neq('user_id', userId);

    if (candidates && candidates.length > 0) {
      const partner = candidates[0];
      const roomId = uuidv4();

      // 두 유저 모두 matched 처리
      await supabase.from('telepathy_sessions_queue').update({
        status: 'matched',
        room_id: roomId,
        partner_id: partner.user_id,
        partner_username: partner.username,
        partner_nickname: partner.nickname
      }).eq('id', mySession.id);

      await supabase.from('telepathy_sessions_queue').update({
        status: 'matched',
        room_id: roomId,
        partner_id: userId,
        partner_username: mySession.username,
        partner_nickname: mySession.nickname
      }).eq('id', partner.id);

      // 로그 기록
      await supabase.from('telepathy_sessions_log').insert([
        {
          user_id: userId,
          username: mySession.username,
          nickname: mySession.nickname,
          word,
          round,
          result: 'matched',
          partner_id: partner.user_id,
          partner_username: partner.username,
          partner_nickname: partner.nickname,
          room_id: roomId
        },
        {
          user_id: partner.user_id,
          username: partner.username,
          nickname: partner.nickname,
          word,
          round,
          result: 'matched',
          partner_id: userId,
          partner_username: mySession.username,
          partner_nickname: mySession.nickname,
          room_id: roomId
        }
      ]);

      return res.json({
        matched: true,
        roomId,
        senderId: userId,
        senderUsername: mySession.username,
        senderNickname: mySession.nickname,
        receiverId: partner.user_id,
        receiverUsername: partner.username,
        receiverNickname: partner.nickname,
        word
      });
    }

    return res.json({ matched: false });
  } catch (err) {
    console.error('❌ /check 오류:', err);
    res.status(500).json({ success: false });
  }
});

// ✅ 3. 세션 종료
router.post('/end', async (req, res) => {
  const token = req.cookies.token;
  const { roomId } = req.body;

  console.log("📥 /end 요청 body:", req.body);   // ✅ body 값 확인
  console.log("📥 /end token:", token);          // ✅ 쿠키 확인

  if (!token || !roomId) {
    return res.status(400).json({ success: false, message: "필수 값 누락" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    console.log("✅ decoded userId:", userId, "roomId:", roomId);

    // roomId로 세션 찾기
    const { data: mySession, error: sessionError } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .single();

    console.log("🔍 mySession:", mySession);  // ✅ 조회된 세션
    console.log("🔍 sessionError:", sessionError); // ✅ 에러 내용

    if (sessionError || !mySession) {
      return res.status(404).json({ success: false, message: "세션 없음" });
    }

    // ended 처리
    const { error: updateError } = await supabase.from('telepathy_sessions_queue')
      .update({ status: 'ended' })
      .match({ user_id: userId, room_id: roomId });

    console.log("📝 ended update error:", updateError);

    // 로그 기록
 
    const { error: logError } = await supabase
    .from('telepathy_sessions_log')
    .upsert({
      user_id: userId,
      username: mySession.username,
      nickname: mySession.nickname,
      word: mySession.word,
      round: mySession.round,
      result: 'ended',   // 🔹 기존 matched → ended 로 덮어씀
      partner_id: mySession.partner_id,
      partner_username: mySession.partner_username,
      partner_nickname: mySession.partner_nickname,
      room_id: mySession.room_id,
      created_at: new Date()
    }, { onConflict: ['round', 'user_id'] });   // 🔑 유니크키 기준으로 upsert

    console.log("📝 logError:", logError);

    if (logError) {
      console.error("❌ 로그 저장 실패:", logError);
      return res.status(500).json({ success: false, message: "로그 저장 실패" });
    }

    res.json({ success: true, message: "세션 종료 완료" });
  } catch (err) {
    console.error('❌ /end 오류 (catch):', err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});


// ✅ 4. 세션 상태 확인
router.post('/session-status', async (req, res) => {
  const { word, round, userId } = req.body;
  if (!word || !round || !userId) return res.status(400).json({ active: false });

  try {
    const { data } = await supabase.from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('round', round)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return res.json({ active: false });

    return res.json({
      active: data.status === 'matched' || data.status === 'waiting',
      ...data
    });
  } catch (err) {
    console.error('❌ /session-status 오류:', err);
    res.status(500).json({ active: false });
  }
});

module.exports = router;
