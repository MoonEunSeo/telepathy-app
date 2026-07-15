// API 엔드포인트 레이어 — 클라이언트 요청/응답 처리, 쿠키 설정 및 상태코드 반환
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import getRandomNickname from '../utils/randomNickname';
import type { RegisterRequest, RegisterResponse } from '@shared/api';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

router.post('/', async (req: Request, res: Response) => {
  const { username, password, phone, gender, birthdate } = req.body as RegisterRequest;

  if (!username || !password || !phone || !gender || !birthdate) {
    return res
      .status(400)
      .json({ success: false, message: '모든 항목을 입력해주세요.' } satisfies RegisterResponse);
  }

  try {
    // 중복 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},phone.eq.${phone}`);

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 아이디 또는 전화번호입니다.',
      } satisfies RegisterResponse);
    }

    // 비밀번호 해시
    const hash = await bcrypt.hash(password, 10);

    // DB 저장 (닉네임 미설정 방지: 가입 시 기본 랜덤 닉네임 부여 → nickname null 원천 차단)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: hash,
        phone,
        gender,
        birthdate,
        nickname: getRandomNickname(),
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ JWT 생성
    const token = jwt.sign({ user_id: newUser.id, username }, process.env.JWT_SECRET as string, {
      expiresIn: '60d',
    });

    // ✅ 쿠키에 저장
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // 배포시 true + https 필요
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60일
    });

    return res.status(201).json({
      success: true,
      message: '회원가입 완료 및 자동 로그인 성공',
    } satisfies RegisterResponse);
  } catch (err) {
    console.error('회원가입 오류:', (err as Error).message || err);
    return res
      .status(500)
      .json({ success: false, message: '회원가입에 실패했습니다.' } satisfies RegisterResponse);
  }
});

export default router;
