// API 엔드포인트 레이어 — 클라이언트 요청/응답 처리, 쿠키 설정 및 상태코드 반환
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import getRandomNickname from '../utils/randomNickname';
import { buildCookieOptions } from '../utils/cookie';
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
    // 중복확인
    // .or()는 값이 아니라 "식"을 문자열로 받는다. 여기에 입력을 조립하면
    // 쉼표·점이 필터 문법으로 읽혀 질의 구조가 바뀐다.
    // username = "zzz,phone.eq.010-1234-5678"
    // → 남의 번호가 등록됐는지 물어보는 조건이 하나 끼어든다.
    // 컬럼과 값을 분리해 넘기는 .eq()는 입력이 무엇이든 구조가 안 바뀐다.
    const [byUsername, byPhone] = await Promise.all([
      supabase.from('users').select('id').eq('username', username).maybeSingle(),
      supabase.from('users').select('id').eq('phone', phone).maybeSingle(),
    ]);

    // Supabase는 DB 오류를 예외가 아니라 error로 준다.
    // 확인하지 않으면 data가 null이 되어 중복 검사를 그냥 통과하고,
    // UNIQUE 위반으로 500이 나간다.
    if (byUsername.error || byPhone.error) {
      console.error('❌ 중복 확인 실패:', byUsername.error?.message ?? byPhone.error?.message);
      return res
        .status(500)
        .json({ success: false, message: '서버 오류' } satisfies RegisterResponse);
    }

    // 어느 쪽이 겹쳤는지는 구분해 알리지 않는다.
    // 전화번호를 구분해 답하면 "이 번호가 가입돼 있는지"를 아무나
    // 물어볼 수 있게 되어, 지금 막으려는 유출이 정문으로 들어온다.
    if (byUsername.data || byPhone.data) {
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
    const token = jwt.sign(
      { user_id: newUser.id, username, role: 'member' },
      process.env.JWT_SECRET as string,
      {
        expiresIn: '60d',
      },
    );

    // ✅ 쿠키에 저장
    res.cookie('token', token, buildCookieOptions(1000 * 60 * 60 * 24 * 60));

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
