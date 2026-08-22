# Redis Streams Adapter 도입 리뷰

## 확인 항목

- Redis URL과 오류 로그에 비밀값 비노출
- Redis 비활성·준비·장애 readiness 상태 구분
- Streams Adapter에 중복 Redis 클라이언트를 직접 전달하지 않음
- Redis 장애 시 메모리 Adapter 동적 폴백 없음
- 종료 시 Adapter 이후 Redis 클라이언트 종료
- connection state recovery 미활성 상태 명시

## 검증 결과

- Redis 비활성 모드 실제 기동 및 `/healthz`, `/readyz` 확인
- Redis 활성·연결 실패 모드의 제한된 재시도와 실패 종료 확인
- `compose.yml` YAML 파싱 확인

## 남은 검증

현재 작업 PC에는 Docker/Redis가 없어 실제 Adapter broadcast와 이미지 빌드는 Docker 환경에서 실행해야 한다.
