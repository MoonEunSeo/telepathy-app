# 성능 측정

최적화(TanStack Query / React Hook Form / Zustand) 도입 **전후를 수치로 비교**하기 위한 측정 기록.

> 원칙: **한 번에 하나씩 도입하고, 매번 재측정한다.**
> 여러 개를 동시에 바꾸면 무엇이 효과였는지 증명할 수 없다.

---

## 시나리오

| ID | 대상 | 도구 | 겨냥하는 개선 | 상태 |
|---|---|---|---|---|
| [S1](s1-duplicate-fetch/README.md) | 화면 전환 시 중복 API 호출 | Network | TanStack Query 캐시 | ✅ **적용 완료 → 15건 → 6건 (−60%)** |
| [S4](s4-rapid-click/README.md) | 하트 연타 시 중복 요청·경쟁 상태 | Network | TanStack Query 동시성 제어 | ✅ **useMutation 적용 → 경쟁 상태 차단** |
| [S6](s6-polling/README.md) | MainPage 폴링 요청량 | Network | 폴링 주기 조정 / 소켓 push | ✅ **소켓 push 적용 → 59건/분 → ≈0** |
| [S2](s2-form-rerender/README.md) | 폼 타이핑당 리렌더 | React DevTools Profiler | React Hook Form | ✅ **적용 완료 → 글자당 1.0회 → 0회** |
| [S3](s3-context-rerender/README.md) | Context 리렌더 전파 | Profiler | Zustand (도입 여부 판단) | ✅ 측정 완료 → **도입 안 함** |
| [S7](s7-compression/README.md) | 응답 압축 미적용 | Network / curl | gzip·brotli 압축 | ✅ **적용 완료 → −70.4%** |
| [S8](s8-favicon/README.md) | 파비콘 660 kB (SVG 안의 래스터) | curl / canvas | 벡터 SVG 교체 | ✅ **적용 완료 → 485 kB → 666 B (−99.9%)** |
| [S5](s5-lighthouse/README.md) | 페이지 로드 종합 | Lighthouse (3회 중앙값) | 전체 | ✅ **측정 완료 → 점수 76, TBT 0·CLS 0** |

> S3(Zustand)은 **측정 결과 유의미한 리렌더 낭비가 없으면 도입하지 않는다.**
> 서버 데이터를 TanStack Query가 가져가면 전역 상태 자체가 크게 줄기 때문이다.
> "측정해보니 불필요해서 도입하지 않았다"도 유효한 결론이다.

### 아직 착수하지 않은 것

위 표가 **측정하고 개선한 기록**이라면, 코드에서 발견했으나 아직 손대지 않은 항목은
[최적화 백로그](optimization-backlog.md)(O1~O13)에 있다.
기술 도입을 검토했다가 기각한 근거는 [기술 도입 검토](../project/tech-adoption-review.md)에 있다.

---

## 측정 환경

| 항목 | 값 |
|---|---|
| 기준 커밋 | `c9d5d06` + `/api/auth/check` role 반환 수정 |
| 빌드 | **production** (`npm run build` → `npm start` → `localhost:5000`) |
| 예외 | **S2·S3 은 dev 서버(`localhost:5179`)** — Profiler 가 prod 빌드에서 동작하지 않음 |
| 번들 | JS `index-C8_4mCFr.js` 485.8 kB (gzip 152.5 kB) / CSS 85.2 kB (gzip 16.7 kB) |
| 브라우저 | Chrome 시크릿 창 (확장 없음) |
| Network | **Fast 4G** (S4·S6 일부는 Slow 4G — 각 문서에 명시) |
| CPU | **4x slowdown** |
| 뷰포트 | 390 × 844 (모바일) |
| DevTools | Preserve log ✅ / Disable cache ✅ / Fetch·XHR 필터 |
| 계정 | 회원(member) 로그인 상태 |

---

## 측정 원칙

| 원칙 | 이유 |
|---|---|
| **프로덕션 빌드로 측정** | React dev 빌드는 2~5배 느리고 경고 오버헤드가 있어 개선폭이 왜곡된다 |
| **시크릿 창 + 확장 끄기** | 확장 프로그램이 요청을 추가하거나 지표를 오염시킨다 |
| **3회 실행 후 중앙값** | 1회 측정은 노이즈가 지배한다 |
| **스로틀 고정** | 조건이 다르면 before/after 비교가 성립하지 않는다 |
| **환경 기록** | "어떤 조건에서 쟀나"에 답할 수 있어야 한다 |

### dev / prod 구분

- **리렌더 "횟수"는 dev·prod가 동일** → Profiler 측정은 dev 서버에서 해도 된다.
  (프로덕션 빌드는 프로파일링 정보가 제거되어 Profiler를 쓸 수 없다)
- **시간 지표(LCP·TBT·INP)는 반드시 prod 빌드**에서 측정한다.

### 성능 측정에 쓰지 않는 것

**Jest/RTL로 성능을 측정하지 않는다.** jsdom은 레이아웃 엔진이 없어 실제 브라우저 성능과
상관관계가 없다. 테스트는 **리팩터링 회귀 안전망** 용도로만 쓰고,
이 프로젝트는 Vite 기반이므로 Jest가 아니라 **Vitest**를 쓴다.

### 미재현도 기록한다

가설이 재현되지 않으면 **그 사실과 추정 원인까지 남긴다.**
"예상했으나 측정 결과 발생하지 않았다"는 결론도 유효하며,
검증되지 않은 가설을 개선 근거로 삼지 않기 위한 기준이다.

실제 사례:
- **S4** UI–DB 상태 불일치 → 0/6회 미재현
- **S6** 백그라운드 폴링 낭비 → 브라우저가 이미 차단 중이라 개선 여지 없음
- **S3** Context 연쇄 리렌더 → 미발생. 이를 근거로 **Zustand 도입하지 않기로 결정**

---

## 첨부

Before 스크린샷은 각 시나리오 폴더 안에 있다.

| 위치 | 내용 |
|---|---|
| `s1-duplicate-fetch/before-network.png` | 화면 전환 시 API 요청 15건 (Fast 4G) |
| `s4-rapid-click/before-fast4g-1~3.png` | 연타 시 PATCH 요청, Fast 4G 3회차 |
| `s4-rapid-click/before-slow4g-1~3.png` | 연타 시 PATCH 요청, Slow 4G 3회차 |
| `s6-polling/before-foreground-current-round.png` | 포그라운드 1초 폴링 59건 / 60초 |
| `s6-polling/before-foreground-server-time.png` | 포그라운드 10초 폴링 8건 |
| `s6-polling/before-background-current-round.png` | 백그라운드 전환 후 폴링 중단 |
| `s2-form-rerender/before-register.png` | Register 12글자 입력 시 commit 12회 |
| `s2-form-rerender/before-verify-mvp.png` | Verify_mvp 8글자 입력 시 commit 9회 |
| `s3-context-rerender/before-word-click-1~2.png` | 단어 클릭 시 리렌더 (원인: MainPage) |
| `s3-context-rerender/before-idle-10s.png` | 무조작 10초에 commit 26회 |

> S7·S8 은 스크린샷 대신 `curl` 출력값을 문서에 직접 기록했다 — 전송 바이트는 헤더로 검증 가능하기 때문이다.
> S8 의 렌더 검증은 브라우저 canvas 로 픽셀 색을 추출해 수치로 남겼다.
