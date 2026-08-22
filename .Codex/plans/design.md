# Redis 원자적 매칭 대기열 설계

- 라운드별 sorted set은 대기 순서, hash는 서버가 확정한 사용자·socket·단어
  메타데이터를 담는다.
- Lua 하나에서 만료 정리, 본인 재선택 제거, 동일 단어 최고령 후보 선점,
  상대가 없을 때 현재 사용자 등록을 수행한다.
- member는 `user_id`로 해 한 라운드에서 사용자 하나가 두 후보가 되지 않게 한다.
- 라운드는 클라이언트 payload를 신뢰하지 않고 현재 서버 라운드와 같은지 검증한다.
- Redis 후보 선점 후 PostgreSQL의 두 waiting 행을 `status=waiting` 가드로 갱신한다.
  한 쪽이라도 실패하면 해당 `room_id`를 가드로 두 행을 waiting으로 보상한다.
- PostgreSQL 갱신 성공 후에만 room join·`matched`를 수행한다.
- `REDIS_MATCHING_ENABLED`는 별도 이행 플래그며, 활성 시 Redis 연결을 필수로 한다.
- Redis 매칭 모드에서 장애가 나면 레거시 DB 큐로 요청별 폴백하지 않는다.
