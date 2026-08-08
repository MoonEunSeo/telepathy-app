import { Link } from 'react-router-dom';

// 존재하지 않는 주소.
// 서버가 이 셸을 404 상태로 보내므로 (server/app.ts — shared/seo.ts 의 ROUTE_META 에 없는 경로)
// 색인되지 않는다.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6">
      <h1 className="[font-family:'Judson','Gowun_Dodum',serif] text-[56px] leading-none font-bold text-[var(--main-title-color)] min-[1025px]:text-[76px]">
        404
      </h1>
      <p className="text-center text-[15px] text-[var(--auth-lead-color)] min-[1025px]:text-[17px]">
        찾으시는 페이지가 없습니다
      </p>
      <Link
        to="/"
        className="text-[15px] text-[var(--main-title-color)] underline underline-offset-4"
      >
        메인으로 돌아가기
      </Link>
    </div>
  );
}
