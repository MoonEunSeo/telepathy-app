# Supabase 작업 규칙

이 파일은 `supabase/` 범위에 적용되며 루트 [`AGENTS.md`](../AGENTS.md)를 보완한다.

## Migration

- 적용된 migration 파일은 수정하지 않는다.
- 변경마다 새 timestamp migration을 추가한다.
- 주요 ID는 UUID, 시간은 `timestamptz`를 사용한다.
- 관계에는 FK를 명시하고 물리 삭제보다 상태·익명화·`deleted_at`을 우선한다.
- 여러 테이블이 함께 바뀌는 도메인 작업은 RPC 함수로 원자성을 보장한다.
- destructive SQL에는 영향 범위, 백업, 롤백 또는 복구 절차를 문서화한다.

## 보안

- 클라이언트가 접근하는 테이블은 RLS 정책을 함께 검토한다.
- service role key는 서버에서만 사용한다.
- 개인정보와 채팅 원문이 포함된 dump를 저장소에 추가하지 않는다.
- 함수의 `search_path`, 권한, `SECURITY DEFINER` 필요성을 명시적으로 검토한다.

## 타입과 문서

- 스키마 변경 후 `server/src/types/database.types.ts`를 생성 절차로 갱신한다.
- 생성 타입은 직접 편집하지 않는다.
- 운영 전환 순서가 바뀌면 `supabase/cutover/README.md`를 함께 수정한다.
