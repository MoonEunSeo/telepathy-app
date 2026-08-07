// 진입 스플래시: 브랜드 워드마크를 잠깐 덮어 보여준다.
//
// 라우트가 아니라 오버레이인 이유 — 루트 URL 이 색인될 때 잡히는 콘텐츠는 MainPage 여야 한다.
// 라우트로 두면 크롤러가 보는 '/' 의 본문이 이 워드마크 한 줄이 된다.
//
// h1 을 쓰지 않는다. MainPage 에 이미 h1 이 있고, 이 오버레이는 장식이다.
// z-10000 은 MainPage 가 띄우는 모달(최대 z-9999)보다 위다 —
// 예전엔 스플래시 동안 MainPage 가 아예 없었으므로 모달도 뜨지 않았다.
export default function SplashScreen() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6"
    >
      <div className="[font-family:'Judson','Gowun_Dodum',serif] text-[56px] leading-none font-bold text-[var(--main-title-color)] min-[1025px]:text-[76px]">
        Telepathy
      </div>
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
