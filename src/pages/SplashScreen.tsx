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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6">
      <h1 className="[font-family:'Judson',serif] text-[56px] leading-none font-bold text-[var(--main-title-color)] min-[1025px]:text-[76px]">
        Telepathy
      </h1>
      <p className="text-center text-[15px] text-[var(--auth-lead-color)] min-[1025px]:text-[17px]">
        같은 단어를 떠올린 순간, 마음이 이어집니다
      </p>
      <div className="mt-2 flex gap-2">
        <span className="h-2 w-2 [animation:pulseDot_1.2s_ease-in-out_infinite] rounded-full bg-[var(--main-title-color)]" />
        <span className="h-2 w-2 [animation:pulseDot_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-[var(--main-title-color)]" />
        <span className="h-2 w-2 [animation:pulseDot_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-[var(--main-title-color)]" />
      </div>
    </div>
  );
}
