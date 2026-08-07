# S11. 라우트 코드 스플리팅

> 조건: **production build / localhost:5000 / Chrome**
> 전송량은 `curl -H "Accept-Encoding: gzip"` 로, Lighthouse 는 12 CLI headless 로 쟀다.
> Before 는 같은 세션에서 변경분을 `git stash` 하고 다시 빌드해 측정했다.

## 무엇이 문제였나

`App.tsx` 가 페이지 컴포넌트 19개를 전부 정적으로 import 하고 있었다.

```tsx
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import ChatPage from './pages/ChatPage';
…
```

정적 import 는 "이 파일이 필요하다"가 아니라 **"이 파일을 번들에 넣어라"** 다. 결과는 단일 번들 547.8 kB(gzip 170.9 kB)이고, Vite 도 500 kB 초과 경고를 내고 있었다.

로그인 화면 하나를 보려고 채팅·결제·약관 코드까지 받는다.

## 번들에 무엇이 들어 있었나

소스맵의 `mappings` 를 해석해 **생성된 바이트를 원본 모듈에 귀속**시켰다. 소스 글자 수로 세면 주석·개발용 코드가 섞여 왜곡된다 (같은 번들을 글자 수로 세면 `react-router` 가 22.0% 로 나오지만 실제 생성 바이트는 7.9% 다).

| 차지하는 것 | 바이트 | 비중 | 첫 화면에 필요한가 |
|---|---:|---:|---|
| `react-dom` | 179,627 | 35.0% | ✅ 항상 |
| `axios` | 44,956 | 8.8% | ❌ **3개 파일에서만** |
| `react-router` | 40,693 | 7.9% | ✅ 항상 |
| `socket.io` 계열 | 41,355 | 8.0% | ✅ MainPage 가 쓴다 |
| `@tanstack/query-core` | 33,002 | 6.4% | ✅ |
| `react-hook-form` | 27,168 | 5.3% | ❌ 폼 4개 화면 |
| `src/components` | 21,177 | 4.1% | 일부 |
| `react-toastify` | 16,315 | 3.2% | ✅ App 에 상주 |
| **페이지 20개 전부** | **80,060** | **15.6%** | 한 번에 하나만 |

**`axios` 가 가장 큰 발견이다.** 쓰는 곳이 `LikePage` · `WordSetPage` · `WordSetForm` 셋뿐이고 전부 첫 화면이 아니다.

`socket.io` 는 `MainPage` 와 `App.tsx` 가 쓰므로 첫 화면에서 뺄 수 없다.

## 무엇을 바꿨나

`SplashScreen` 만 남기고 19개 라우트를 `lazy` 로 바꾸고, `Routes` 를 `Suspense` 로 감쌌다.

**`SplashScreen` 은 초기 번들에 남긴다** — 진입 화면이라 쪼개면 이것 하나 받으려고 왕복이 한 번 더 생겨 첫 페인트가 늦어진다.

**`ToastContainer` 는 `Suspense` 밖에 둔다** — 안에 넣으면 라우트 청크를 받는 동안 토스트도 함께 사라진다.

## 결과

### 전송량 (gzip)

| | Before | After | 차이 |
|---|---:|---:|---:|
| **초기 로드 (`/`)** | 170,915 B | **111,495 B** | **−59,420 (−34.8%)** |
| `/main` 도달까지 총합 | 170,915 B | 120,018 B | −50,897 (−29.8%) |
| raw (압축 전) | 547,820 B | 347,140 B | −200,680 (−36.6%) |
| 청크 수 | 1개 | 30개 | |

첫 화면에서 빠진 것들이다.

| 청크 | gzip | 언제 받나 |
|---|---:|---|
| `axios` | 17.02 kB | `/likes` · `/wordset` |
| `FieldMessage` (react-hook-form) | 10.06 kB | 폼 4개 화면 |
| `MainPage` | 7.55 kB | 스플래시 직후 |
| `ChatPage` | 5.75 kB | 매칭 성사 후 |
| `LikePage` | 4.37 kB | |
| `ServiceAgreement` | 3.06 kB | |
| 나머지 24개 | | |

Vite 의 500 kB 초과 경고도 사라졌다.

### Lighthouse — 폰트 차단, 5회

| 지표 | Before | After | 차이 |
|---|---:|---:|---:|
| 성능 점수 | 96 | **98** | +2 |
| **FCP** | 2,102 ms | **1,803 ms** | **−299 (−14.2%)** |
| **LCP** | 2,412 ms | **2,116 ms** | **−296 (−12.3%)** |
| TBT | 0 | 0 | — |
| Speed Index | 2,102 ms | 1,803 ms | −299 (−14.2%) |

5회 편차가 FCP 1 ms · LCP 2 ms 다.

## 측정 방법 — Lighthouse 3회로는 판정할 수 없었다

처음엔 [S5](../s5-lighthouse/README.md) 와 같은 조건(폰트 포함, 3회)으로 쟀다.

| | 회차 | 중앙값 |
|---|---|---:|
| Before | 80 / 94 / 94 | **94** |
| After | 82 / 82 / 97 | **82** |

**중앙값만 보면 나빠진 것으로 읽힌다. 측정 실패다.** 회차가 두 덩어리로 갈리고, 어느 덩어리가 많이 나왔느냐가 중앙값을 정한다.

`benchmarkIndex` 는 2,387~2,488 로 균일해 CPU 편차가 아니었다. 단서는 빠른 회차에서 **Speed Index 가 FCP 와 같다**는 점이었다.

| 폰트 완료 | FCP | SI−FCP | 점수 |
|---:|---:|---:|---:|
| ~1,880 ms | ~2,250 | 0 | 94~97 |
| ~2,350 ms | ~3,100~3,400 | ~1,300 | 80~82 |

**`fonts.googleapis.com` 응답이 470 ms 늦으면 점수가 12~15점, FCP 가 1,100 ms 흔들린다.** 우리 변경(−299 ms)보다 큰 폭이다.

그래서 두 오리진을 차단하고 다시 쟀다. 절대값은 실제보다 좋게 나오지만 **번들 변화만 분리해 비교할 수 있다.**

```bash
npx lighthouse@12 http://localhost:5000/ --only-categories=performance \
  --blocked-url-patterns="*fonts.googleapis.com*" \
  --blocked-url-patterns="*fonts.gstatic.com*" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu"
```

같은 덩어리끼리 비교하면 차단 없이도 After 가 낫다.

| 덩어리 | Before LCP | After LCP |
|---|---:|---:|
| 폰트 ~1,880 ms | 2,714 ms | **2,268 ms** |
| 폰트 ~2,350 ms | 3,822 ms | **3,458 ms** |

> Lighthouse CLI 가 종료 시 `EPERM ... rmSync` 로 실패하지만 **결과 JSON 은 그 전에 기록된다.** Windows 에서 Chrome 임시 프로필을 지우는 단계의 문제이며 측정에 영향이 없다.

## 대가

`/main` 진입 시 청크 4개 **8,523 B** 를 추가로 받는다. 요청 시작이 **1,947 ms** 로, 스플래시가 끝나고 `navigate` 가 실행된 뒤다. 로컬은 몇 ms 지만 느린 회선에서는 `/main` 이 그만큼 늦게 뜬다.

스플래시가 떠 있는 1.5초 동안 `import('./MainPage')` 로 미리 받으면 없어진다. **이번에는 넣지 않았다** — `feat/tel-31-seo-route-metadata` 가 `/` 를 `MainPage` 로 바꾸고 스플래시를 오버레이로 재작성하고 있어, 그 구조에서는 MainPage 가 초기 청크와 함께 요청되므로 불필요해진다.

## 핵심 지표

| 지표 | 값 |
|---|---:|
| 초기 JS 전송 (gzip) | **170,915 B → 111,495 B (−34.8%)** |
| 초기 JS raw | 547,820 B → 347,140 B (−36.6%) |
| LCP (폰트 차단) | 2,412 ms → **2,116 ms (−12.3%)** |
| FCP (폰트 차단) | 2,102 ms → **1,803 ms (−14.2%)** |
| 첫 화면에서 빠진 `axios` | 17.02 kB |
| `/main` 추가 요청 | 8,523 B (4개 청크) |

## 남은 것

**외부 폰트가 번들보다 큰 변수다.** 이번 측정에서 `fonts.googleapis.com` 응답 470 ms 차이가 우리 개선폭의 3배를 흔들었다. [S9](../s9-fonts/README.md) 가 남긴 self-host + preload 항목의 근거가 여기서 나왔다.

**`react-dom` 179 kB 는 줄일 수 없다.** 초기 청크 347 kB 중 절반이며, 남은 감축 여지는 `react-toastify`(16 kB) 정도다.

**MainPage 프리페치** — tel-31 머지 후 필요 여부를 다시 본다.
