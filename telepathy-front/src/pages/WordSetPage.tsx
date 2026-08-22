// ✅ WordSetPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAxios } from '../lib/axiosClient';
import WordSetForm from '../components/WordSetForm';
import type { CurrentUser, ProfileResponse } from '../types';

export default function WordSetPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ 사용자 정보 자동 로드
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiAxios.get<ProfileResponse>('/api/nickname/profile', {
          withCredentials: true,
        });
        if (res.data.success && (res.data.id || res.data.userId)) {
          setCurrentUser({
            id: (res.data.id || res.data.userId)!,
            nickname: res.data.nickname,
            username: res.data.username,
          });
        } else {
          console.warn('⚠️ 로그인 정보 없음 — 로그인 페이지로 이동');
          navigate('/login');
        }
      } catch (err) {
        console.error('❌ 사용자 정보 불러오기 실패:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // ✅ 로딩 상태 표시
  if (loading) return <h3 className="text-center">로딩 중입니다 ⏳</h3>;

  // ✅ 로그인 안 되어있을 경우
  if (!currentUser)
    return (
      <div className="mt-10 text-center">
        <h3>로그인이 필요합니다 🔒</h3>
        <button
          onClick={() => navigate('/login')}
          className="mt-3 cursor-pointer rounded-lg border-none bg-[#d18f92] px-5 py-2.5 text-white"
        >
          로그인하러 가기
        </button>
      </div>
    );

  // ✅ 정상 사용자라면 단어세트 입력 폼 표시
  return (
    /* 구 .wordset-page — 리디자인 */
    <div className="box-border flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-5 py-20 pb-28 text-center max-[480px]:px-4 max-[480px]:py-[60px] max-[480px]:pb-24">
      {/* 구 .wordset-title — serif + 그라디언트("나만의"만 강조) */}
      <h1 className="mb-3 text-[23px] leading-tight font-bold min-[1025px]:text-[26px]">
        <span className="[background-image:var(--wordset-title-grad)] [background-clip:text] [font-family:'Judson','Gowun_Dodum',serif] text-transparent [-webkit-background-clip:text]">
          나만의
        </span>{' '}
        <span className="[font-family:'Judson','Gowun_Dodum',serif] text-[var(--main-title-color)]">
          단어세트 만들기
        </span>{' '}
        <span className="text-[19px]">✨</span>
      </h1>
      {/* 구 .wordset-description */}
      <p className="mb-8 [font-family:'Gowun_Dodum',sans-serif] text-[15px] leading-[1.6] text-[var(--main-subtitle-color)] max-[480px]:mb-7">
        당신만의 감정을 담은 네 개의 단어를 입력해보세요. <br />
        동일한 단어를 입력한 사람과의 연결이 시작됩니다 ✨
      </p>

      {/* 구 .wordset-card */}
      <div className="box-border w-full max-w-[440px] rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-7 py-8 [box-shadow:var(--card-shadow)] [border:1px_solid_var(--color-border-subtle)] max-[480px]:px-5 max-[480px]:py-7 min-[1025px]:max-w-[520px]">
        <WordSetForm />
      </div>
    </div>
  );
}
