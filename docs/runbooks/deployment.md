# 배포 Runbook

## 현재 배포

- `v3` 브랜치가 Render 운영 배포와 연결되어 있다.
- 현재 Express가 API, Socket.IO, Vite 정적 파일을 함께 제공한다.
- `v3` 직접 push는 운영 반영이므로 문서 전용 예외 외에는 PR을 사용한다.
- Render Build Filters 상세는 `docs/conventions/git.md`를 따른다.

## 목표 배포

아래 절차는 Docker/Cloudflare/Lightsail 구현 후 명령과 리소스 ID를 확정해 갱신한다.

1. PR에서 `npm run verify` 통과
2. 웹 정적 산출물을 Cloudflare Pages에 배포
3. 백엔드 이미지를 GitHub Actions에서 빌드하고 registry에 push
4. Lightsail에서 새 이미지 pull
5. API 인스턴스를 순차 교체하고 `/healthz` 확인
6. Socket 재접속, Redis 연결, 핵심 API 확인
7. 실패 시 `rollback.md`에 따라 이전 이미지로 복구

## 배포 전 확인

- 환경변수와 비밀값이 서버에만 존재하는가
- migration 선행 여부와 롤백 영향이 확인됐는가
- API·Socket 계약이 앱의 기존 버전과 호환되는가
- Redis 장애 시 동작과 메모리 제한이 확인됐는가
- 로그에 토큰·개인정보가 노출되지 않는가

실제 Lightsail 리소스명, registry 경로, 배포 명령은 인프라 구현 PR에서 추가한다.
