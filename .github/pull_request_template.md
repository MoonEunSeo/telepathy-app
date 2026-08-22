## 변경 이유

<!-- 무엇을 했는지보다 왜 필요한 변경인지 적습니다. -->

## 변경 범위

- [ ] 서버/API
- [ ] 프론트/UI
- [ ] Socket.IO
- [ ] Supabase migration
- [ ] 인프라/CI
- [ ] 문서만

## 검증

- [ ] `npm run verify`
- [ ] 변경 기능 수동 확인
- [ ] 버그 수정이라면 재현 테스트 추가

## 영향 확인

- [ ] API 또는 Socket 계약 변경 시 `shared/`와 문서를 함께 갱신함
- [ ] DB 변경 시 새 migration을 추가하고 롤백 영향을 확인함
- [ ] 환경변수 변경 시 `.env.example`을 갱신함
- [ ] 배포 방식 변경 시 runbook과 ADR을 갱신함

## 관련 이슈

<!-- 예: TEL-42 -->
