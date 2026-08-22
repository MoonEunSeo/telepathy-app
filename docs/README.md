# Telepathy 문서 지도

이 파일은 작업 목적에 따라 필요한 문서로 이동하기 위한 진입점이다. 현재 진행 상태는
[`project/status.md`](project/status.md)를 먼저 확인한다.

## 규약

| 문서                                                         | 내용                                 |
| ------------------------------------------------------------ | ------------------------------------ |
| [`conventions/architecture.md`](conventions/architecture.md) | 현재 애플리케이션 구조와 핵심 흐름   |
| [`conventions/tech-stack.md`](conventions/tech-stack.md)     | 기술 스택과 Tailwind 주의점          |
| [`conventions/typescript.md`](conventions/typescript.md)     | 공유 타입, 네이밍, 모듈 규칙         |
| [`conventions/supabase.md`](conventions/supabase.md)         | Supabase 쿼리와 오류 처리            |
| [`conventions/git.md`](conventions/git.md)                   | 브랜치, 커밋, PR, 운영 배포 주의사항 |

## 프로젝트와 의사결정

| 경로                                                               | 내용                                 |
| ------------------------------------------------------------------ | ------------------------------------ |
| [`project/`](project/)                                             | 마이그레이션, 현재 상태, 알려진 이슈 |
| [`project/architecture-design.md`](project/architecture-design.md) | 웹·API·Redis·Capacitor 목표 설계     |
| [`adr/`](adr/)                                                     | 수락·폐기된 아키텍처 결정과 대안     |
| [`domain/`](domain/)                                               | 기능별 인계 지식의 중립 진입점       |

## 개발과 운영

| 경로                                               | 내용                    |
| -------------------------------------------------- | ----------------------- |
| [`guides/development.md`](guides/development.md)   | 로컬 설정과 개발 루프   |
| [`guides/testing.md`](guides/testing.md)           | 테스트 범위와 작성 기준 |
| [`runbooks/deployment.md`](runbooks/deployment.md) | 현재·목표 배포 절차     |
| [`runbooks/rollback.md`](runbooks/rollback.md)     | 장애 시 롤백 기준       |

## 성능과 검토 기록

- [`perf/README.md`](perf/README.md): 측정 원칙과 완료된 최적화
- [`perf/optimization-backlog.md`](perf/optimization-backlog.md): 미착수 최적화 후보
- [`project/tech-adoption-review.md`](project/tech-adoption-review.md): 기술 도입 기각 근거

## 문서 관리 규칙

- 현재 사실과 목표 상태를 섞지 않는다.
- 장기 규칙은 `AGENTS.md`와 `conventions/`, 현재 진행 상황은 `project/status.md`에 둔다.
- 중요한 기술 선택은 ADR로 남긴다.
- 코드 동작과 문서가 다르면 코드를 확인해 문서를 같은 변경에서 수정한다.
