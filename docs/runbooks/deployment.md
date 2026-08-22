# 배포 Runbook

## 현재 배포

- 과거에는 `v3` 브랜치가 Render 운영 배포와 연결되어 있었다.
- 현재 원격 `v3` 브랜치가 삭제되어 있으므로 다음 운영 변경 전에 Render 대시보드의 실제 배포 브랜치를 확인한다.
- 현재 Express가 API, Socket.IO, Vite 정적 파일을 함께 제공한다.
- 확인 전까지 어떤 브랜치도 운영 자동 배포 대상으로 단정하지 않는다.
- Render Build Filters 상세는 `docs/conventions/git.md`를 따른다.

## 목표 배포

아래 절차는 Docker/Cloudflare/Lightsail 구현 후 명령과 리소스 ID를 확정해 갱신한다.

1. PR에서 `npm run verify` 통과
2. 웹 정적 산출물을 Cloudflare Pages에 배포
3. 백엔드 이미지를 GitHub Actions에서 빌드하고 registry에 push
4. Lightsail에서 새 이미지 pull
5. API 인스턴스를 순차 교체하고 `/healthz`, `/readyz` 확인
6. Socket 재접속, Redis 연결, 핵심 API 확인
7. 실패 시 `rollback.md`에 따라 이전 이미지로 복구

## 배포 전 확인

- 환경변수와 비밀값이 서버에만 존재하는가
- migration 선행 여부와 롤백 영향이 확인됐는가
- API·Socket 계약이 앱의 기존 버전과 호환되는가
- Redis 장애 시 동작과 메모리 제한이 확인됐는가
- 로그에 토큰·개인정보가 노출되지 않는가

실제 Lightsail 리소스명, registry 경로, 배포 명령은 인프라 구현 PR에서 추가한다.

## 컨테이너 사전 검증

```bash
docker compose config
docker compose build api
docker compose up -d
curl --fail http://localhost:5000/healthz
curl --fail http://localhost:5000/readyz
docker compose down
```

현재 `compose.yml`은 로컬 검증용이며 다음 조건을 운영 배포 전에 충족해야 한다.

- reverse proxy만 80/443 포트를 공개하고 API·Redis는 내부 네트워크에 둔다.
- Redis 인증을 적용하고 비밀값을 이미지·Compose 파일에 직접 기록하지 않는다.
- GHCR의 `sha-<git-sha>` 이미지로 배포하고 `latest`를 배포 기준으로 사용하지 않는다.
- `/readyz`의 `dependencies.redis`가 `ready`인지 확인한다. `unavailable`이면 배포를 중단한다.
- 운영별 `REDIS_PRESENCE_KEY`를 분리하고 heartbeat는 `PRESENCE_TTL_MS`보다 짧게 설정한다.
- 배포 교체 중 60초 이내 소켓 복구·room 유지·접속자 수 불변을 확인한다.
- API 2개 인스턴스 간 Socket broadcast 통합 테스트를 통과하기 전에는 수평 확장하지 않는다.
