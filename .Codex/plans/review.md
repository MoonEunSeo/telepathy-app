# 서버 배포 단위 분리 리뷰

## 확인 항목

- 하드코딩된 REST·Socket.IO origin 제거
- `/api` 정확 경로를 포함한 JSON 404 보장
- 정적 제공 비활성 상태에서 `dist` 접근 차단
- CORS 허용·차단, liveness·readiness 회귀 테스트
- TypeScript 명시적 `any`와 비밀값 추가 여부 검사
- 백엔드 이미지의 프론트 디렉터리 제외

## 검증 결과

- `npm run verify` 통과
- API 전용 모드 실제 기동 후 `/healthz`, `/readyz`, JSON 404, 허용 CORS 응답 확인
- `compose.yml` YAML 파싱 확인

## 남은 검증

현재 작업 PC에는 Docker CLI가 없어 `docker compose config`와 이미지 빌드는 Docker가 설치된 환경에서 실행해야 한다.
