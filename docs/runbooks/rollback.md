# 롤백 Runbook

## 원칙

- 애플리케이션 이미지는 이전 정상 버전으로 되돌릴 수 있어야 한다.
- DB migration은 애플리케이션 롤백만으로 되돌아가지 않으므로 backward-compatible하게 설계한다.
- Redis 상태는 휘발성으로 간주하며 PostgreSQL 영속 데이터를 롤백 수단으로 사용하지 않는다.

## 현재 Render

1. Render Events에서 마지막 정상 배포를 확인한다.
2. 이전 정상 커밋으로 재배포한다.
3. `/healthz`, 로그인, 매칭, Socket 연결을 확인한다.
4. DB 스키마 변경이 포함됐다면 migration의 호환성을 별도로 점검한다.

## 목표 Lightsail

1. 현재 장애 이미지 태그와 직전 정상 태그를 기록한다.
2. reverse proxy에서 신규 인스턴스를 제외한다.
3. 직전 정상 이미지로 컨테이너를 기동한다.
4. `/healthz`, `/readyz`와 Redis·Supabase 연결을 확인한다.
5. 트래픽을 복구하고 오류율을 관찰한다.

정확한 명령과 이미지 태그 정책은 Docker CI/CD 구현 시 추가한다.
