// routes/comment.routes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const getRandomNickname = require('../utils/randomNickname');

// 댓글 불러오기
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 댓글 작성하기
router.post('/', async (req, res) => {
  let { username, nickname, content } = req.body;
  if (!username || !content) {
    return res.status(400).json({ error: 'username과 content는 필수입니다.' });
  }
  if (!nickname || nickname.trim() === '') {
    nickname = getRandomNickname();
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([{ username, nickname, content }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

module.exports = router;
