# S9. 화면별 웹폰트 전송량

> 조건: **production build / localhost / 스로틀 없음 / 뷰포트 390×844 / 비로그인**
> 측정 대상이 **전송 바이트**이므로 네트워크 스로틀과 무관하다.
>
> 측정 시점의 워킹 트리에 다른 작업(SEO 메타 서버 치환·라우팅 개편)이 커밋되지 않은 채
> 섞여 있었다. 해당 변경은 경로(`/main` → `/`)와 `<head>` 메타뿐이라 **화면에 그려지는
> 텍스트와 `font-family` 스택은 바뀌지 않았고**, 이 측정에 영향을 주지 않는다.

## 왜 다시 쟀는가

[S8](../s8-image-assets/README.md) 을 진행하며 폰트도 함께 검토했고, 그때 **"첫 화면 폰트 617 kB, Inter 제거로 23 kB 절감"** 이라는 수치를 적었다. **둘 다 틀렸다.**

| 잘못된 계산 | 무엇을 빠뜨렸나 |
|---|---|
| 첫 화면 617 kB | 소스 코드에 있는 문자를 전부 세었다. 실제로 **화면에 그려지는 글자**가 아니다 |
| Inter 23 kB | `font-family` **스택 순서**를 계산에 넣지 않았다. Inter 는 3번째라 앞의 폰트가 못 그리는 글자에만 쓰인다 |

Inter 쪽은 커밋 `efbc6b0` 에서 정정했다 (실제 절감은 CSS 284 B, 폰트 파일은 0 B). 이 문서는 남은 하나 — **화면별 실제 전송량**을 다시 측정한 기록이다.

## 측정 방법

### 실패한 방법 두 가지

브라우저에서 페이지를 열고 무엇이 로드됐는지 읽는 방식은 **폰트 캐시에 오염된다.**

| 방법 | 결과 |
|---|---|
| `document.fonts` 에서 `status === 'loaded'` 인 face 수집 | 측정 순서대로 9 → 16 → 18 → 23 으로 **단조 증가**. 캐시에 들어온 face 가 다음 문서에서도 loaded 로 보인다 |
| `performance.getEntriesByType('resource')` | 같은 이유로 9 → 16 → 18 → 23. `transferSize` 는 0(캐시 적중)이라 크기 판별에도 못 쓴다 |

보호 라우트(`/wordset`·`/likes`·`/mywords`)가 전부 `/login` 으로 리다이렉트되는데도 수치가 서로 달랐던 것이 단서였다. 같은 화면인데 값이 다르면 화면이 아니라 측정 환경을 재고 있는 것이다.

### 채택한 방법

캐시와 무관하게 **결정론적으로 계산**했다.

```
① 각 화면을 iframe 으로 렌더 → DOM 텍스트 노드를 순회
   보이는 노드만 (display:none · visibility:hidden · opacity:0 제외)
② 노드마다 getComputedStyle(부모).fontFamily 로 폰트 스택을 얻어
   [스택 → 실제 그려진 문자 집합] 을 만든다
③ 문자마다 스택을 앞에서부터 훑어, 그 글자를 담은 서브셋이 있는
   첫 패밀리를 고른다 (Google Fonts CSS 의 unicode-range 로 판정)
④ 필요한 서브셋의 woff2 를 직접 내려받아 바이트를 합산
```

`③` 이 핵심이다. 브라우저의 폰트 선택은 **글자 단위**로 일어나므로, 스택에 이름이 있다고 그 폰트를 받는 것이 아니다. 앞선 계산이 틀린 지점이 여기였다.

Google Fonts 가 서빙하는 서브셋은 `normal / 400` 기준으로 Gowun Batang 95개 · Gowun Dodum 95개 · Judson 3개다.

## 결과

| 화면 | 합계 | Gowun Dodum | Gowun Batang | Judson |
|---|---:|---|---|---|
| `/helppage` | **206.2 kB** | 13개 / 186 kB | — | 1개 / 20 kB |
| `/terms/service-agreement` | **204.5 kB** | — | 12개 / 205 kB | — |
| `/login` | **195.8 kB** | 8개 / 115 kB | 5개 / 81 kB | — |
| `/terms/privacy-policy` | **175.3 kB** | — | 10개 / 175 kB | — |
| `/findpassword` | **156.2 kB** | 4개 / 57 kB | 6개 / 99 kB | — |
| `/register` | **147.9 kB** | 5개 / 67 kB | 5개 / 81 kB | — |
| **`/` (MainPage)** | **117.9 kB** | 7개 / 98 kB | — | 1개 / 20 kB |
| `/changepassword` | **57.4 kB** | 4개 / 57 kB | — | — |

전 화면 합집합은 **410.7 kB(고유 woff2 26개)** 다. 화면별 값을 단순히 더하면 1,261.2 kB 지만, 화면 사이에 공유되는 서브셋이 많아 실제 한 세션 비용은 합집합에 가깝다.

## 분석

### ① 첫 화면은 117.9 kB — 앞선 추정의 1/5

`/` 는 Gowun Dodum 7개 서브셋 + Judson 1개다. **617 kB 는 5.2배 과대 계상이었다.**

원인은 두 가지다. 소스 코드의 모든 문자열(도달하지 않는 분기·에러 메시지 포함)을 세었고, 폰트 스택 순서를 무시해 Gowun Batang·Inter 몫까지 더했다.

### ② Gowun Batang 은 첫 화면에서 0 kB다

`/` 와 `/helppage`·`/changepassword` 에서 Batang 서브셋이 하나도 필요하지 않다. Batang 은 **로그인·가입·비밀번호 찾기의 안내 문구와 약관 페이지**에서만 쓰인다.

Batang 을 Gowun Dodum 으로 통합하면 어떻게 되는지 같은 방법으로 계산했다.

| 화면 | 현재 | Batang 통합 시 | 차이 |
|---|---:|---:|---:|
| `/login` | 195.8 kB | **114.6 kB** | **−81.2 kB (−41%)** |
| `/findpassword` | 156.2 kB | 81.8 kB | −74.4 kB (−48%) |
| `/register` | 147.9 kB | 82.5 kB | −65.4 kB (−44%) |
| `/terms/service-agreement` | 204.5 kB | 168.9 kB | −35.6 kB (−17%) |
| `/terms/privacy-policy` | 175.3 kB | 144.7 kB | −30.6 kB (−17%) |
| `/` · `/helppage` · `/changepassword` | — | — | **변화 없음** |

**첫 화면에는 이득이 없고 인증 흐름에서만 30~48% 줄어든다.** 앞서 "첫 화면 291 kB 절감"이라고 적은 것도 같은 이유로 틀렸다.

이 통합은 세리프를 산세리프로 바꾸는 디자인 변경이라 성능 판단만으로 결정할 수 없다. 근거 수치만 남긴다.

### ③ 버튼 텍스트가 브랜드 폰트로 그려지지 않는다

측정 중에 발견했다. `/` 에서 **33개 문자가 Arial 로 렌더된다.**

| 요소 | 텍스트 | 계산된 `font-family` |
|---|---|---|
| `<button>` 단어 그리드 | 복숭아 · 포도 · 사과 · 귤 | `Arial` |
| `<span>` 하단 네비 | 홈 · 좋아요 · 마이 | `Arial` |
| `<button>` 푸터 | ⓒ Telepathy … | `Arial` |

원인은 [`telepathy-front/src/index.css:40`](../../../telepathy-front/src/index.css) 의 `@layer base` 다. `button` 에 테두리만 리셋하고 **`font-family: inherit` 이 없다.**

```css
@layer base {
  button {
    border-width: 0;
    border-style: solid;
  }
}
```

`<button>`·`<input>`·`<select>`·`<textarea>` 는 상속 대신 UA 기본 글꼴을 쓴다. Chrome/Windows 에서는 Arial 이다. 소스와 빌드 CSS 어디에도 `Arial` 문자열이 없는데 Arial 로 렌더되는 이유가 이것이다.

**서비스의 핵심 UI 인 단어 선택 버튼이 브랜드 폰트로 그려지지 않는다.**

고치면 바이트는 늘어난다. 같은 방법으로 계산했다.

| 화면 | 현재 | `font: inherit` 적용 시 | 차이 |
|---|---:|---:|---:|
| `/` | 117.9 kB | 150.5 kB | **+32.6 kB** |
| `/findpassword` | 156.2 kB | 165.5 kB | +9.3 kB |
| `/changepassword` | 57.4 kB | 66.7 kB | +9.3 kB |

**정확한 렌더링이 전송량을 늘리는 경우다.** 성능과 디자인 일관성이 반대 방향을 가리키므로 성능 판단으로 결정하지 않는다.

`/` 의 +32.6 kB 는 측정 시점에 표시된 단어(복숭아·포도·사과·귤) 기준이다. 단어 그리드는 라운드마다 바뀌므로 **실제 비용은 단어 목록에 따라 달라진다.** 고정값으로 기록하면 안 된다.

### ④ Judson 제목의 한글은 시스템 세리프로 떨어진다

`[font-family:'Judson',serif]` 로 지정한 제목에 한글이 들어 있다.

| 화면 | 텍스트 | 실제 렌더 |
|---|---|---|
| `/login` | 로그인 | 시스템 `serif` |
| `/changepassword` | 비밀번호 변경 | 시스템 `serif` |
| `/findpassword` | 비밀번호 찾기 | 시스템 `serif` |

Judson 은 라틴 전용이라 한글 글리프가 없고, 스택의 다음이 `serif` 라 브랜드 폰트를 건너뛰고 OS 기본 세리프가 그린다. **Windows·macOS·Android 에서 서로 다른 글꼴로 보인다.**

스택을 `'Judson', 'Gowun Dodum', serif` 로 바꾸면 한글이 Gowun Dodum 으로 떨어진다. 라틴 제목의 모양은 그대로다.

### ⑤ 서버 압축은 폰트에 듣지 않는다

woff2 는 내부가 Brotli 로 압축돼 있다. [S7](../s7-compression/README.md) 의 `compression()` 미들웨어를 통과해도 줄지 않으며, 애초에 `fonts.gstatic.com` 이 서빙하므로 이 서버를 거치지도 않는다. [S8](../s8-image-assets/README.md) 의 이미지와 같은 성격이다.

폰트에서 줄일 수 있는 것은 **받는 서브셋의 개수**뿐이다.

## 핵심 지표

| 지표 | 값 |
|---|---:|
| 첫 화면(`/`) 폰트 전송량 | **117.9 kB** |
| 가장 무거운 화면(`/helppage`) | 206.2 kB |
| 가장 가벼운 화면(`/changepassword`) | 57.4 kB |
| 전 화면 합집합 (고유 woff2 26개) | 410.7 kB |
| 렌더 차단 폰트 CSS (gzip) | 26,687 B |
| Gowun Batang 통합 시 `/login` | 114.6 kB (−41%) |
| 버튼 폰트 상속 시 `/` | 150.5 kB (+28%) |

## 남은 것

**폰트 self-host + preload.** 현재 `fonts.googleapis.com` 으로 나가는 CSS 는 render-blocking 이고, 오리진 두 곳(`googleapis` · `gstatic`)에 핸드셰이크가 필요하다. `preconnect` 가 걸려 있어 일부 완화되지만, CSS → 폰트 파일의 2단 요청 사슬은 남는다. 이 사슬이 LCP 에 직접 영향을 준다.

self-host 하려면 **Google Fonts CSS 의 unicode-range 분할을 그대로 복제해야 한다.** 채팅 서비스라 사용자가 입력하는 한글을 미리 알 수 없어 정적 서브셋으로는 대응할 수 없다.

**측정하지 않은 화면** — `/mypage` · `/mywords` · `/likes` 는 비로그인 상태라 `/login` 으로 리다이렉트돼 측정하지 못했다. `/chatpage` 도 매칭 없이는 `/` 로 돌아간다. 로그인 세션으로 다시 재야 한다.

**모달·토스트 미포함** — 상호작용 후 나타나는 텍스트는 측정에 들어가지 않았다. 신고·닉네임 변경 모달 등이 추가 서브셋을 요구할 수 있다.
