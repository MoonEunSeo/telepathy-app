# S8. 파비콘 660 kB — SVG 안에 들어 있던 래스터

> 조건: **production build / localhost / 스로틀 없음**
> 측정 대상이 **전송 바이트**이므로 네트워크 스로틀과 무관하다. 시간 지표는 측정하지 않았다.

## 대상 문제

`telepathy-front/public/favicon.svg` 가 **659,996 B** 였다. 확장자는 SVG인데 내용물은 PNG 두 장이다.

```
<svg width="1000" height="1000">
  <style> @media (prefers-color-scheme: dark) { ... } </style>
  <g id="light-icon"> <image 472×455  xlink:href="data:image/png;base64,..."/> </g>
  <g id="dark-icon">  <image 998×977  xlink:href="data:image/png;base64,..."/> </g>
</svg>
```

| 구성 | 크기 | 비고 |
|---|---:|---|
| SVG 마크업 | 1,380 B | 전체의 0.2% |
| base64 문자열 | 658,616자 | 전체의 99.8% |
| ├ 라이트 PNG | 52,634 B (472×455) | |
| └ 다크 PNG | **441,327 B (1633×1598)** | 998×977 로 축소 배치 |

문제가 겹친 지점이 셋이다.

**① 해상도 과다.** 탭 파비콘은 CSS 기준 16 px 이다. DPR 3 을 감안해도 48 px 이면 충분한데 1633 px 이 들어 있었다. 필요량의 34배, 픽셀 수로는 1,150배다.

**② 래스터를 SVG 로 감쌌다.** SVG 는 텍스트 문서라 바이너리를 그대로 담지 못한다. PNG 를 base64 로 변환해야 하고, 그 과정에서 **정확히 +33.3%** 가 붙는다 (3바이트 → 4글자). 벡터의 이점은 하나도 얻지 못한 채 비용만 추가됐다.

**③ 테마 이미지 두 장을 한 파일에 담았다.** 다크 모드 분기를 파일 안 `@media` 로 처리하려다 보니, 라이트 모드에서도 다크용 441 kB 를 함께 받는다.

이 구조는 파비콘 생성 사이트에 PNG 를 업로드하면 나오는 기본 산출물이다.

### S7 과의 관계

| | 자산 성격 | 압축 결과 |
|---|---|---|
| [S7](../s7-compression/README.md) | JS·CSS — 반복 토큰이 많은 텍스트 | −70.4% |
| **S8** | **base64 로 감싼 PNG — 이미 압축된 데이터** | **−27%** (아래) |

S7 이 "압축이 잘 듣는 자산을 압축한" 기록이라면, S8 은 **압축으로 해결되지 않는 자산**을 다룬다.

## 측정 방법

S7 과 동일하다.

```bash
npm run build && npm start        # production build, localhost:5000

curl -s -H "Accept-Encoding: br, gzip" -o /dev/null -w '%{size_download}' http://localhost:5000/favicon.svg
```

Before 는 이전 파일을 `git show origin/v3:...` 로 꺼내 **같은 서버·같은 경로**로 서빙해 측정했다.

## 결과 (Before / After)

| Accept-Encoding | Before | After | 절감 |
|---|---:|---:|---:|
| `br, gzip` | 485,235 B | **666 B** | **−99.86%** |
| `gzip` | 480,200 B | 663 B | −99.86% |
| (없음) | 659,996 B | 1,150 B | −99.83% |

`Content-Encoding: br` 이 협상됐다.

**brotli 가 gzip 보다 컸다** (485,235 vs 480,200, +1.0%). 이미 DEFLATE 로 압축된 PNG 를 base64 로 부풀린 데이터라 두 알고리즘 모두 얻을 게 없고, brotli 쪽 컨텍스트 오버헤드만 남았다. 텍스트 자산에서 brotli 가 유리했던 S7 과 반대 결과다.

### 압축이 듣지 않은 이유

```
PNG 원본                        493,961 B   ← 이미 DEFLATE 압축됨
  ↓ base64 (+33.3%)
favicon.svg                     659,996 B
  ↓ gzip
전송                            480,200 B   ← −27%
```

gzip 이 줄인 27% 는 **base64 가 만든 거품**이다. 도달한 480 kB 는 원래 PNG 를 그냥 gzip 한 474,455 B 와 거의 같다.

base64 는 8비트 자리에 6비트어치 정보만 담으므로 이론상 최대 75% 까지만 되돌아간다. 실측 72.8% 가 이 값과 맞는다. **즉 압축으로는 원본 PNG 크기 아래로 내려갈 수 없고, 이미지 자체를 줄여야 한다.**

## 개선 시도 3회

파비콘은 원래 벡터 SVG 로 만드는 것이 표준이므로(Chrome 80+ / Firefox / Edge 지원, Safari 는 `.ico` 폴백), **진짜 벡터로 다시 만드는 것**을 목표로 잡았다.

| 시도 | 크기 | path 수 | 경로 명령 | 결과 |
|---|---:|---:|---:|---|
| ① 자동 추적 (라이트) | 11,574 B | 12 | — | 캔버스 전체를 `#000000` 으로 칠하는 path 포함 → **검은 사각형으로 렌더** |
| ② 자동 추적 (다크) | 215,377 B | 283 | — | 그림자 그라데이션을 15색으로 추적 |
| ③ Figma `PNG to SVG` 플러그인 | 23,132 B | 38 | 직선 1,195 / 곡선 212 | 픽셀 경계를 따라간 다각형 |
| **④ ①에서 배경·노이즈 제거 + SVGO** | **1,150 B** | **2** | **직선 13 / 곡선 18** | **채택** |

③ 의 직선 1,195개는 픽셀 계단이다. 반면 ④ 는 명령 31개로, 실제 폰트 아웃라인과 같은 수준이다 (참고: Libre Baskerville `T` 글리프 36개, Judson `T` 21개).

### 폰트 아웃라인으로 다시 그리는 안은 기각

로고가 세리프 대문자 `T` + 원 두 도형이므로, 사이트 제목 서체(Judson)의 글리프를 그대로 쓰면 완전한 벡터가 된다고 봤다. Judson TTF 에서 `T` 글리프를 추출해 494 B 짜리 파비콘을 만들었다.

원본 PNG 와 픽셀 단위로 겹쳐 일치율(IoU)을 쟀다.

| 후보 | IoU |
|---|---:|
| **채택안 (자동 추적 정리본)** | **91.5%** |
| Libre Baskerville 400 | 82.9% |
| Libre Baskerville 700 | 82.6% |
| Judson 400 | 79.1% |
| Spectral 700 | 76.7% |
| Cardo 700 | 76.4% |

Google Fonts 세리프 **26종을 굵기별 49개** 받아 `T` 글리프를 원본 T 의 박스(277×274)에 맞춰 넣고 전부 대조했다. 최고가 82.9% 로 채택안(91.5%)에 못 미친다.

로고의 `T` 는 가로/세로 비가 **1.011** 인데 Judson 은 0.858, 세리프 폰트 대부분이 0.85~0.95 다. Google Fonts 에 없는 서체이거나 손으로 수정한 글자꼴로 보인다.

→ **폰트로 다시 그리면 로고 모양이 바뀐다.** 성능 과제가 아니라 디자인 변경이므로 여기서 멈췄다. Judson 버전(494 B)은 서체를 통일하기로 결정할 경우를 위해 남겨두지 않고 폐기했다. 필요하면 위 절차로 재현할 수 있다.

## 핵심 지표

| 지표 | Before | After | 개선 |
|---|---:|---:|---:|
| **파비콘 전송량** (Chrome·Firefox) | **485,235 B** | **666 B** | **−484,569 B (−99.86%)** |
| 파비콘 원본 | 659,996 B | 1,150 B | −99.83% |
| 저장소 아이콘 합계 | 678,765 B | 1,150 B | −99.83% |
| `<link rel="icon">` 선언 | 4개 | 2개 | — |

저장소 합계는 함께 삭제한 `favicon-96x96.png`(3,683 B) · `favicon-dark.ico`(15,086 B) 를 포함한다. 브라우저는 파비콘을 하나만 받으므로 이 둘은 전송량에는 잡히지 않던 사장 파일이다.

Safari 는 이전에도 `.ico`(15,086 B) 를 받았으므로 변화가 없다.

## 검증

`localhost:5000` 에서 canvas 로 렌더링해 색을 추출했다.

| 테마 | 32 px | 256 px |
|---|---|---|
| 라이트 | T `#383b3a` · 점 `#db2726` | 동일 |
| 다크 | T `#dedfdf` · 점 `#ffd8d8` | 동일 |

잉크 픽셀 비율이 32 px 13.4% / 256 px 14.3% 로 같다. 배율이 달라져도 형태가 유지된다.

`/favicon-96x96.png` · `/favicon-dark.ico` 는 SPA 폴백(`text/html`)이 응답한다 — 파일이 삭제된 상태가 맞다.

## 적용 내역

**`telepathy-front/public/favicon.svg`** — 1,150 B 벡터로 교체

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="38 5 422 422">
  <style>
    .g{fill:#383B3A}.d{fill:#DB2726}
    @media(prefers-color-scheme:dark){.g{fill:#DEDFDF}.d{fill:#FFD8D8}}
  </style>
  <path class="g" d="…T…"/><path class="d" d="…원…"/>
</svg>
```

`viewBox` 는 내용 bbox(x 92–405, y 40–392)를 정사각형으로 감싸고 10% 여백을 준 값이다. 파비콘은 정사각형이어야 한다.

**`telepathy-front/index.html`** — 아이콘 선언 4줄 → 2줄

```diff
-<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
 <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
-<link rel="shortcut icon" href="/favicon.ico" />
-<link rel="icon" type="image/x-icon" href="/favicon-dark.ico" media="(prefers-color-scheme: dark)" />
+<link rel="icon" href="/favicon.ico" sizes="32x32" />
```

다크 분기를 SVG 안 `@media` 가 담당하므로 `favicon-dark.ico` 가 필요 없고, 크기 대응은 벡터가 하므로 `favicon-96x96.png` 도 필요 없다. **벡터로 만들면 다크 모드 대응 비용이 이미지 한 장에서 CSS 두 줄(약 150 B)로 바뀐다** — 이번 개선폭의 큰 부분이 여기서 나왔다.

**삭제** — `favicon-96x96.png` · `favicon-dark.ico`

## 남은 것

같은 성격(과대 해상도 · 잘못된 포맷)의 자산이 더 있다. 전부 압축이 듣지 않는 이미지다.

| 파일 | 크기 | 실제 내용 | 표시 크기 |
|---|---:|---|---|
| `src/assets/Halloween.svg` | 358,228 B | SVG 안에 2048×1136 JPEG | 배경 (할로윈 테마 전용) |
| `public/og-image.png` | 285,198 B | 1200×630 PNG | 크롤러 전용 |
| `src/assets/profile_image.png` | 86,873 B | 243×243 PNG | 프로필 |
| `src/assets/toss_qr.jpg` | 45,150 B | 489×488 JPEG | 200×200 |

`Halloween.svg` 는 테마 CSS 청크에서만 참조하므로 평소에는 받지 않고, `og-image.png` 는 크롤러만 받는다. 둘 다 LCP 와 무관해 **전송량 절감**으로만 기록해야 한다.

참조가 0건인 파일 4개도 남아 있다 — `public/vite.svg`(1,497 B) · `public/icons.svg`(5,031 B) · `src/assets/vite.svg`(8,709 B) · `src/assets/react.svg`(4,126 B). `src/assets/` 쪽 둘은 import 가 없어 번들에 들어가지 않고, `public/` 쪽 둘은 dist 에 그대로 복사된다.

**LCP 는 이번 변경으로 거의 움직이지 않는다.** 파비콘은 브라우저가 낮은 우선순위로 받는다. MainPage 에는 이미지가 없어 LCP 요소가 `h1` 텍스트이고, 이를 좌우하는 것은 render-blocking CSS(Google Fonts 27 kB + 자체 CSS 16 kB)와 JS 172 kB 파싱이다. 그쪽은 [O4 코드 스플리팅](../optimization-backlog.md)과 폰트 self-host 에서 다룬다.
