import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 진입 스플래시: 브랜드 워드마크를 잠깐 보여준 뒤 메인 페이지로 이동.
export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // 최소 1.5초 노출 후 페이지 이동
    const timer = setTimeout(async () => {
      navigate('/main', { replace: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6">
      <h1 className="[font-family:'Judson',serif] text-[56px] min-[1025px]:text-[76px] font-bold leading-none text-[var(--main-title-color)]">
        Telepathy
      </h1>
      <p className="text-center text-[15px] min-[1025px]:text-[17px] text-[var(--auth-lead-color)]">
        같은 단어를 떠올린 순간, 마음이 이어집니다
      </p>
      <div className="mt-2 flex gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--main-title-color)] [animation:pulseDot_1.2s_ease-in-out_infinite]" />
        <span className="w-2 h-2 rounded-full bg-[var(--main-title-color)] [animation:pulseDot_1.2s_ease-in-out_0.2s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-[var(--main-title-color)] [animation:pulseDot_1.2s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}
