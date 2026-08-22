# 도메인 지식 지도

현재 기능별 상세 인계 메모는 `.claude/issues/`에 있다. 파일명은 도구에 종속되어 있지만 내용은 프로젝트
도메인 지식이므로 모든 에이전트가 읽을 수 있다.

| 도메인 | 문서                                                             |
| ------ | ---------------------------------------------------------------- |
| 인증   | [`.claude/issues/auth.md`](../../.claude/issues/auth.md)         |
| 사용자 | [`.claude/issues/users.md`](../../.claude/issues/users.md)       |
| 매칭   | [`.claude/issues/matching.md`](../../.claude/issues/matching.md) |
| 채팅   | [`.claude/issues/chat.md`](../../.claude/issues/chat.md)         |
| 결제   | [`.claude/issues/payment.md`](../../.claude/issues/payment.md)   |
| 신고   | [`.claude/issues/report.md`](../../.claude/issues/report.md)     |
| 콘텐츠 | [`.claude/issues/content.md`](../../.claude/issues/content.md)   |
| 프론트 | [`.claude/issues/frontend.md`](../../.claude/issues/frontend.md) |
| 공통   | [`.claude/issues/common.md`](../../.claude/issues/common.md)     |

장기적으로는 내용을 `docs/domain/`으로 이동하고 `.claude/issues/`에는 호환 포인터만 남긴다. 이번 설정
변경에서는 기존 참조를 깨지 않기 위해 이동하지 않는다.
