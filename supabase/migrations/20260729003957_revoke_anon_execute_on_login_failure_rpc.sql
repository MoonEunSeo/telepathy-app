-- revoke ... from public 만으로는 부족했다.
-- Supabase 는 alter default privileges 로 anon·authenticated 에게
-- 함수 EXECUTE 를 "명시적으로" 부여한다. PUBLIC 경유가 아니라서
-- from public 회수에 걸리지 않는다.
--
-- 앞 마이그레이션 직후 실측:
--   grantee        privilege
--   service_role   EXECUTE
--   authenticated  EXECUTE   ← 남아 있었다
--   anon           EXECUTE   ← 남아 있었다
--   postgres       EXECUTE
--
-- security invoker 이므로 anon 이 호출해도 함수 안의 UPDATE 가
-- 테이블 권한 부족으로 실패하긴 한다(TEL-12 에서 회수함).
-- 다만 테이블 권한이 언젠가 되돌아오면 그 즉시 "아무 계정이나 잠그는"
-- 서비스 거부 통로가 된다. 방어를 두 겹으로 둔다.

revoke execute on function public.record_login_failure(uuid, integer, integer)
  from anon, authenticated;

-- 앞으로 만들 함수에도 같은 규칙을 적용한다.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
