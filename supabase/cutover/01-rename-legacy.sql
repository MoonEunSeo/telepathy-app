-- 운영 전환 1/N — 레거시 테이블을 legacy_ 접두사로 옮긴다.
--
-- V2 가 users·payments·nickname_histories 등 같은 이름을 쓰므로 먼저 비켜줘야 한다.
-- dev-v2 도 같은 구조지만 이 rename 은 마이그레이션 이력에 없어(README 참조)
-- 여기서 새로 작성했다.
--
-- ⚠️ 이 시점부터 레거시 서버 코드는 동작하지 않는다. 다운타임의 시작이다.
--    실행 전 백업 필수 — scripts/backup-prod-db.ps1
--
-- 적용 순서: 01 → V2 마이그레이션 14건 → 02 이후

begin;

alter table public.users                    rename to legacy_users;
alter table public.chat_logs                rename to legacy_chat_logs;
alter table public.telepathy_sessions       rename to legacy_telepathy_sessions;
alter table public.telepathy_sessions_queue rename to legacy_telepathy_sessions_queue;
alter table public.telepathy_sessions_log   rename to legacy_telepathy_sessions_log;
alter table public.nickname_histories       rename to legacy_nickname_histories;
alter table public.comments                 rename to legacy_comments;
alter table public.emotion_feedback         rename to legacy_emotion_feedback;
alter table public.reported_reports         rename to legacy_reported_reports;
alter table public.word_history             rename to legacy_word_history;
alter table public.megaphone_logs           rename to legacy_megaphone_logs;
alter table public.balance_game_logs        rename to legacy_balance_game_logs;
alter table public.payments                 rename to legacy_payments;
alter table public.sp_payments              rename to legacy_sp_payments;
alter table public.payment_webhooks         rename to legacy_payment_webhooks;

-- 매핑표. dev-v2 에 있는 것과 같은 구조다.
create table public.legacy_actor_map (
  legacy_id  uuid not null,
  actor_id   uuid not null,
  kind       text not null check (kind in ('USER', 'GUEST')),
  primary key (legacy_id, kind)
);

commit;

-- 검증: 15개가 옮겨졌는지
-- select count(*) from pg_tables where schemaname='public' and tablename like 'legacy\_%';
