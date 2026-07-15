// 구 TermsTemplate.module.css → Tailwind (약관 5개 페이지 공유).
// 문서(prose) 스타일이라 자식 요소(h2/hr/th/td)는 컨테이너의 자식 셀렉터
// 유틸(`[&_h2]:…`)로 한 곳에 모은다 — 긴 약관 본문의 hr/h3 마다 유틸을
// 다는 중복을 피함. (@tailwindcss/typography 의 prose 와 같은 접근)

export const termsContainer =
  "max-w-[460px] mx-auto bg-[var(--color-bg)] p-6 [font-family:'Gowun_Batang',serif] leading-[1.7] text-[#2b2115] text-left " +
  '[&_h2]:text-center [&_h2]:mb-4 ' +
  '[&_hr]:border-x-0 [&_hr]:border-b-0 [&_hr]:[border-top:1px_solid_var(--color-border-strong)] [&_hr]:my-6';

export const styledTable =
  "w-full border-collapse my-5 text-[12px] [font-family:'Gowun_Batang',serif] bg-[#fffdf9] text-[#3c2f27] [box-shadow:0_2px_4px_rgba(0,0,0,0.05)] " +
  '[&_thead_tr]:bg-[#f0e9df] [&_thead_tr]:text-[#3a3020] [&_thead_tr]:text-left ' +
  '[&_th]:py-3 [&_th]:px-4 [&_th]:[border-bottom:1px_solid_#e2dcd2] [&_th]:align-top ' +
  '[&_td]:py-3 [&_td]:px-4 [&_td]:[border-bottom:1px_solid_#e2dcd2] [&_td]:align-top ' +
  '[&_tbody_tr:last-child_td]:[border-bottom:none]';
