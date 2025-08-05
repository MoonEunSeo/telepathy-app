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

module.exports = router;