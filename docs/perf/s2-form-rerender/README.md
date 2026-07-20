# S2. 폼 타이핑당 리렌더

> 측정 환경·원칙은 [README](../README.md) 참조.
> ⚠️ 이 시나리오만 **dev 서버(`localhost:5179`)** 에서 측정한다.
> 프로덕션 빌드는 프로파일링 정보가 제거되어 React DevTools Profiler 가 동작하지 않는다.
> **리렌더 "횟수"는 dev·prod 가 동일**하므로 측정값은 유효하고, 시간 값만 참고용으로 본다.

## 대상 문제

모든 폼이 **제어 컴포넌트(controlled component)** 다. 입력값을 `useState` 로 들고 있어
글자를 칠 때마다 상태가 바뀌고, 그때마다 컴포넌트가 리렌더된다.

```
사용자가 'a' 입력
  → onChange → setUsername('a')
  → 상태 변경 → 컴포넌트 전체 리렌더
  → 자식(입력창·버튼·모달 등) 다시 계산
```

[`Register.tsx:116`](../../../telepathy-front/src/pages/Register.tsx)
```tsx
onChange={(e) => setUsername(e.target.value)}
```

`useState` / `onChange` 를 쓰는 폼은 다음과 같다.

| 파일 | useState | onChange |
|---|---|---|
| `Verify_mvp.tsx` | 9 | 3 |
| `Register.tsx` | 5 | 2 |
| `FindPassword.tsx` | 6 | 4 |
| `WordSetForm.tsx` | 6 | 3 |
| `ChangePassword.tsx` | 5 | 3 |
| `LoginPage.tsx` | 4 | 2 |

## 측정 방법

```
1. localhost:5179/{경로} 접속          ← dev 서버
2. Profiler ⚙️ → "Record why each component rendered" 체크
3. 🔵 녹화 시작 → 입력창에 N글자 타이핑 → 🔴 중지
4. 상단 막대그래프의 commit 수 확인
```

폼 크기에 따른 차이를 보기 위해 **가장 가벼운 폼(Register, 상태 5개)** 과
**가장 무거운 폼(Verify_mvp, 상태 9개)** 을 비교했다.

> Verify_mvp 는 인증번호 발송 후 3분 카운트다운(`timeLeft`)이 1초마다 상태를 바꾸므로,
> **발송 버튼을 누르지 않은 상태**에서 측정해 타이핑 기여분만 분리했다.
> (SMS 실제 발송 비용·발송 제한도 회피)

## 결과 (Before)

### Register (`/register`) — 상태 5개

| 회차 | 입력 글자 | commit | 글자당 | Render (1 commit) |
|---|---|---|---|---|
| 1 | 12 | **12** | 1.0 | 3.8 ms (Register 2.3 ms) |
| 2 | 12 | **12** | 1.0 | 1.6 ms (Register 0.7 ms) |

![Register — 12글자 입력 시 commit 12회](before-register.png)

### Verify_mvp (`/verify-mvp`) — 상태 9개

| 입력 | commit | 내역 | Render (1 commit) |
|---|---|---|---|
| 8글자 + 성별 버튼 1회 | **9** | 타이핑 8 + 클릭 1 | 1.6 ms (Verify_mvp 1.4 ms) |

![Verify_mvp — 8글자 입력 시 commit 9회](before-verify-mvp.png)

## 핵심 지표

| 지표 | Before | After | 개선 |
|---|---|---|---|
| **글자당 리렌더 (Register)** | **1.0회** | | |
| **글자당 리렌더 (Verify_mvp)** | **1.0회** | | |
| 12글자 입력 시 총 commit | **12회** | | |
| 리렌더 범위 | 해당 폼 컴포넌트만 | | |
| 1 commit Render (dev) | 1.6~3.8 ms | | |

## 분석

**① 글자당 정확히 1회 리렌더 — 결정적으로 재현된다.**
Register 2회 측정 모두 `12글자 → 12 commit`. Verify_mvp 도 `8글자 → 8 commit`(+버튼 1).
Profiler 의 **"What caused this update?"** 가 각각 `Register`, `Verify_mvp` 로 표시되어,
원인이 해당 컴포넌트의 상태 변경임이 추정이 아니라 **React 가 알려준 사실**로 확인됐다.

**② 폼 크기와 리렌더 횟수는 무관했다 — 예상과 달랐다.**
"상태가 많은 폼일수록 부담이 클 것"으로 예상했으나, 상태 5개와 9개 폼이
**동일하게 글자당 1회**였다. 리렌더 비용은 상태 개수가 아니라
**컴포넌트 트리 크기**에 좌우되며, 두 폼 모두 트리가 작기 때문이다.

**③ Context 연쇄 리렌더는 없다.**
flame graph 상 렌더 경로는 18단계로 깊다.

```
WordSessionProvider → Context.Provider → BrowserRouter → Router
→ Navigation.Provider → Location.Provider → ModalProvider → Context.Provider
→ App → ThemeProvider → Context.Provider → IntentProvider → Context.Provider
→ AppRoutes → Routes → RenderedRoute → Route.Provider → [폼 컴포넌트]
```

그러나 **주황색으로 강조된 것은 폼 컴포넌트 하나뿐**이고 상위 Provider 는 전부 회색이다.
즉 상위가 함께 리렌더되지 않는다. → **S3(Zustand) 도입 근거가 약해질 수 있는 관찰**이며,
S3 측정에서 확인할 지점이다.

**④ 현재 사용자 체감은 문제없다.**
1 commit 당 Render 가 dev 기준 1.6~3.8 ms 로, 60fps 예산(16.7 ms) 안에 넉넉히 들어온다.
prod 는 더 빠르다. **지금 타이핑이 버벅이지는 않는다.**

따라서 React Hook Form 의 가치는 "현재 느린 것을 고친다"가 아니라
**"폼이 커지거나 자식이 무거워져도 리렌더가 늘지 않는 구조"** 에 있다.
이 점을 과장하지 않고 기록한다.

## 개선 방향

React Hook Form 으로 **비제어 컴포넌트(uncontrolled)** 전환.

| | 제어 (현재) | 비제어 (RHF) |
|---|---|---|
| 값 보관처 | React `useState` | **DOM 자체** |
| 타이핑 시 | 매 글자 상태 변경 → 리렌더 | **리렌더 없음** |
| 값 읽는 시점 | 항상 최신 | 제출 시 (`ref` 로) |

RHF 는 `ref` 로 DOM 입력값을 추적해 **타이핑 중에는 React 를 건드리지 않는다.**
따라서 글자당 리렌더가 0 에 수렴한다.

부가 효과로 검증 로직(필수값·형식·에러 메시지)이 선언적으로 정리된다.
현재는 각 폼이 `useState` 와 조건문으로 직접 처리하고 있다.

### After 측정 시 주의

- 반드시 **같은 글자 수**로 측정한다 (Register 12글자 기준)
- **dev 서버(5179)** 에서 측정한다
- 타이핑 속도가 빠르면 React 가 입력을 배치로 묶어 commit 이 줄어드니
  천천히 또박또박 입력한다
