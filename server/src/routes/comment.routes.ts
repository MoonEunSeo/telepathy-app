// routes/comment.routes.ts
import express, { Request, Response } from 'express';
import supabase from '../config/supabase';
import getRandomNickname from '../utils/randomNickname';

const router = express.Router();

// 댓글 불러오기
router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 댓글 작성하기
router.post('/', async (req: Request, res: Response) => {
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
  res.json(data?.[0]);
});

export default router;
