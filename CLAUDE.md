# CLAUDE.md

telepathy — 같은 단어를 떠올린 사람끼리 익명으로 대화하는 서비스.

## 구조

```
telepathy-app/
├─ server/           Express 5 + TypeScript (tsx 로 직접 실행)
├─ telepathy-front/  React + Vite + TS — 현 활성 프론트
├─ client/           레거시 프론트 (telepathy-front 로 대체됨)
├─ shared/           client↔server 공유 계약 타입 (@shared/*, 타입 전용)
└─ docs/             아키텍처·규약·성능 측정 문서
```

- **UI/디자인 작업은 `telepathy-front`** — `client/`는 레거시다.
- `telepathy-front`는 예전에 중첩 git repo였으나 **2026-07-20 일반 디렉터리로 전환**됐다.
  이제 프론트·서버를 이 저장소에서 함께 커밋한다. 옛 원격 `jhs7942/telepathy-front`에는 push하지 않는다.
- 서버가 `telepathy-front/dist`를 정적 서빙한다 → **prod 확인은 `localhost:5000`**.

## 명령어

```bash
npm run build        # 프론트 프로덕션 빌드
npm start            # 서버 실행 (빌드된 프론트 + API 서빙) → localhost:5000
npm run dev          # 서버 tsx watch
npm run typecheck    # 서버 타입체크

cd telepathy-front && npm run dev   # 프론트 dev (5179, /api → :5000 프록시)
cd telepathy-front && npx tsc -b    # 프론트 타입체크
cd telepathy-front && npx oxlint src/...
```

> `vite preview`는 프록시 설정이 없어 `/api` 호출이 실패한다. prod 동작 확인은 `npm start` 쪽을 쓸 것.
> 커밋 전 **서버·프론트 양쪽 타입체크**를 통과시킨다. `shared/` 변경은 양쪽에 영향을 준다.

---

## 문서

작업 전에 해당 영역 문서를 확인한다.

| 문서 | 내용 |
|---|---|
| [아키텍처](docs/conventions/architecture.md) | 전체 구성·디렉터리·**인증 구조**·**매칭 흐름**·디자인 토큰 |
| [기술스택](docs/conventions/tech-stack.md) | 사용 라이브러리·**Tailwind v4 주의점** |
| [TypeScript 규약](docs/conventions/typescript.md) | `shared/` 사용법·타입 스타일·CJS/ESM 인터롭 |
| [Supabase 규약](docs/conventions/supabase.md) | **에러 처리**·null 비교·소유권 필터 |
| [Git 규약](docs/conventions/git.md) | 브랜치·커밋 형식·**Linear 자동 연결**·`v3` 자동배포 주의 |
| [마이그레이션 계획](docs/project/migration-plan.md) | **TEL-6 마이그레이션 계획 요약** — 테이블 운명 매핑 |
| [TEL-15 진행 상태](docs/project/tel-15-handoff.md) | **진행 중인 작업** — 앱 계층 V2 이행. 완료 범위와 확인 스크립트. **인계 본체는 Linear TEL-16** |
| [알려진 이슈](docs/project/known-issues.md) | 알려진 이슈·이월 과제 |
| [성능 측정](docs/perf/README.md) | 성능 측정 기록 (S1~S7) |
| [최적화 백로그](docs/perf/optimization-backlog.md) | **아직 착수하지 않은 개선 지점** (O1~O13) — 위치·근거·측정법 |
| [기술 도입 검토](docs/project/tech-adoption-review.md) | Kafka·Spark·ES·GraphQL **기각 근거**와 재검토 조건 |

### 특히 자주 걸리는 함정

- **Supabase는 DB 오류를 예외가 아닌 `{ data, error }` 반환값으로 준다** → `error` 확인 없으면 조용히 실패
- **`.eq()` 로는 null 을 못 잡는다** (SQL 3값 논리) → `.is()`
- **Tailwind arbitrary value 안에 공백 금지**, 동적 클래스 조합 금지
- **`as` 는 런타임 검사가 없다** → 외부 경계 값은 사용처에서 방어
- **기능 추가 전 [migration-plan.md](docs/project/migration-plan.md) 확인** — 축소·대체 예정 테이블이 있다
