# S1. 화면 전환 시 중복 API 호출

> 측정 환경·원칙은 [README](README.md) 참조. 조건: **Fast 4G / CPU 4x / production build**

## 대상 문제

각 컴포넌트가 `useEffect` 안에서 독립적으로 `fetch` 한다.
React에는 데이터 캐시가 없으므로 **페이지를 오갈 때마다 같은 데이터를 다시 받는다.**

```
MyPage 진입   → useEffect → word-history 요청 ①
MyWords 이동  → MyPage 언마운트, MyWords 마운트 → 요청 ②   ← 같은 데이터
MyPage 복귀   → 또 마운트 → 요청 ③                          ← 또 같은 데이터
```

각 컴포넌트가 서로의 존재를 모른 채 가져오고, 방금 받은 데이터를 **기억할 곳이 없다.**

### 호출 분산 현황 (코드 기준)

| 엔드포인트 | 호출하는 파일 |
|---|---|
| `/api/nickname/profile` | MyPage, MainPage, LikePage |
| `/api/word-history` | MyPage, MyWords |
| `/api/user/megaphone-count` | MyPage, MainPage |
| `/api/auth/check` | App(라우트 변경마다), session.ts |

## 측정 방법

```
(Network 기록 초기화) → /mypage → /mywords → /mypage → /mywords
```

각 단계마다 화면이 완전히 로드될 때까지 대기.

## 결과 (Before)

| 엔드포인트 | 호출 수 | 각 Time (ms) | 누적 (ms) |
|---|---|---|---|
| `word-history` | **4** | 184, 190, 178, 186 | 738 |
| `auth/check` | **4** | 260, 175, 177, 186 | 798 |
| `profile` | **2** | 185, 179 | 364 |
| `megaphone-count` | **2** | 184, 180 | 364 |
| `current-round` | 3 | 185, 188, 182 | 555 |
| **합계** | **15** (전체 21건 중 Fetch/XHR) | | **2,819** |

전송량: 5.0 kB (전체 170 kB) · 첨부: `s1-before-network.png`

## 핵심 지표

| 지표 | Before | After | 개선 |
|---|---|---|---|
| 총 API 요청 수 | **15건** | | |
| `word-history` 호출 수 | **4회** | | |
| `word-history` 누적 시간 | **738 ms** | | |
| `auth/check` 호출 수 | **4회** | | |
| 제거 가능한 중복 요청 | **8건** | | |
| 중복으로 낭비된 시간 | **≈1,451 ms** | | |

> `제거 가능한 중복`은 캐시 적용 시 1회로 줄일 수 있는 요청 기준 산정
> (word-history 3 + auth/check 3 + profile 1 + megaphone-count 1 = 8건).
> `current-round`는 의도된 폴링이라 중복에서 제외 — [S6](s6-polling.md)에서 별도 측정.

## 분석

- 응답이 **0.3~0.4 kB로 매우 작은데 요청당 180 ms** 가 걸린다.
  → 비용은 **데이터 크기가 아니라 왕복 지연**이다.
- 서버가 Supabase(원격 DB)를 호출하므로 요청 1건에 **네트워크 왕복이 2번** 발생한다.
  ```
  브라우저 ──▶ Express ──▶ Supabase
           ◀──         ◀──
  ```
- 따라서 페이로드 최적화가 아니라 **요청 자체를 없애는 캐싱**이 정확한 해법이다.

## 개선 방향

TanStack Query 도입 — 컴포넌트 바깥의 공용 캐시로 같은 쿼리 키를 재사용.

```
MyWords 진입 → 캐시에 word-history 있음 → 네트워크 요청 없이 즉시 렌더
```

### 함께 발견된 것 — `auth/check` 가 라우트 변경마다 호출

`App.tsx` 의 인증 확인 `useEffect` 가 `location.pathname` 에 의존한다.
인증 상태는 페이지 이동으로 바뀌지 않으므로 **4회 중 3회가 불필요**하다.
