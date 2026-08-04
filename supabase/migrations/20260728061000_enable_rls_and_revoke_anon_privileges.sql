-- 목적: public 스키마를 anon/authenticated 로부터 잠근다.
-- 서버는 service_role(rolbypassrls=true, GRANT 유지)로 접근하므로 영향 없음.
-- 클라이언트가 Supabase 에 직접 접근하는 경로가 없으므로 정책은 만들지 않는다.
--   → 정책 0개 + RLS 활성 = 기본 거부(deny by default)

-- 1) 모든 테이블에 RLS 활성화
do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 2) anon·authenticated 의 테이블 권한 회수
--    RLS 가 막지 못하는 TRUNCATE 까지 차단된다.
--    service_role 은 대상에서 제외한다 — 회수하면 서버가 접근 불가해진다.
revoke all on all tables in schema public from anon, authenticated;

-- 3) 앞으로 생성될 테이블에도 동일 적용
--    마이그레이션으로 신규 테이블을 계속 추가하므로 기본값을 잠가둔다.
alter default privileges in schema public revoke all on tables from anon, authenticated;
