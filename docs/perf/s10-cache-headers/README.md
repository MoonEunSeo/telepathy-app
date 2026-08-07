# S10. 정적 자산 캐시 헤더

> 조건: **production build / localhost / 스로틀 없음 / Chrome**
> Before 는 변경 전 코드를 **5001 포트에 따로 띄워** 같은 브라우저에서 대조했다.
> 포트가 다르면 오리진이 달라 HTTP 캐시도 분리되므로, 두 상태가 서로를 오염시키지 않는다.

## 무엇이 문제였나

`server/app.ts` 의 정적 서빙에 `maxAge` 옵션이 없었다.

```ts
app.use(express.static(distPath));
app.use('/assets', express.static(path.join(distPath, 'assets')));
```

Express 기본값이 0 이라 모든 정적 파일이 이렇게 나간다.

```
Cache-Control: public, max-age=0
ETag: W/"86d0a-19fd9d26bbc"
```

`max-age=0` 은 **저장은 하되 쓸 때마다 서버에 확인하라**는 뜻이다. 재방문하면 자산 하나하나에 조건부 요청(`If-None-Match`)이 붙고 304 를 받는다. 본문은 오지 않지만 **왕복은 그대로 발생한다.**

### 실행되지 않던 코드

두 번째 줄(`/assets`)은 도달하지 않는다. `dist/assets` 는 `dist` 안에 있어서 첫 줄이 `/assets/index-*.js` 요청을 먼저 처리하고 응답을 끝낸다. Express 미들웨어는 먼저 응답한 쪽이 이긴다.

`/assets` 에 다른 헤더를 주려면 **순서를 뒤집어야** 한다.

## 무엇을 바꿨나

| 대상 | 헤더 | 근거 |
|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | 파일명에 내용 해시 → 같은 이름이면 같은 내용 |
| `favicon.*` · `apple-touch-icon.*` · `site.webmanifest` | `public, max-age=86400` | 해시가 없어 같은 URL 로 내용이 바뀔 수 있다 |
| `index.html` | `no-cache` | 새 자산 파일명을 알려주는 진입점 |

### 해시 파일명이 1년 캐시를 안전하게 만든다

```
index-Cq2agJxV.js
      └─ 내용이 1바이트만 바뀌어도 이 값이 바뀐다
```

배포하면 파일명이 달라져 새 URL 이 된다. 오래된 파일이 남아 잘못 쓰일 일이 없다.

`immutable` 은 **사용자가 새로고침을 눌러도 재검증하지 말라**는 뜻이다. `max-age` 만 주면 F5 에서 조건부 요청이 다시 나간다. `maxAge` 가 0 이면 무시되므로 둘은 같이 써야 한다.

### index.html 을 두 곳에서 막아야 하는 이유

SPA 폴백만 고치면 `/` 경로가 샌다. **`express.static` 은 디렉터리 요청에 `index.html` 을 자동으로 내주기 때문에** 루트 요청은 폴백까지 내려가지 않는다. 정적 서빙 쪽에도 `setHeaders` 로 같은 헤더를 걸었다.

`no-cache` 는 "캐시하지 마라"가 아니라 **"쓸 때마다 확인하라"** 다. 저장 자체를 막는 것은 `no-store` 다. `index.html` 은 안 바뀌었으면 304 로 3.5 kB 를 아끼고 바뀌었으면 새로 받아야 하므로 `no-cache` 가 맞다.

## 결과

첫 화면이 참조하는 정적 자산 8개를, 캐시를 채운 뒤 다시 요청했다.

| | Before (`max-age=0`) | After |
|---|---:|---:|
| **네트워크 왕복** | **8회** | **1회** |
| 캐시 적중 (요청 없음) | 0개 | **7개** |
| 헤더 전송량 | 2,400 B | 300 B |

| URL | Before | After |
|---|---|---|
| `/` | 304 (300 B) | 304 (300 B) — 의도대로 유지 |
| `/assets/index-Cq2agJxV.js` | 304 (300 B) | 요청 없음 |
| `/assets/index-DISo5cvy.css` | 304 (300 B) | 요청 없음 |
| `/favicon.svg` | 304 (300 B) | 요청 없음 |
| `/favicon.ico` | 304 (300 B) | 요청 없음 |
| `/apple-touch-icon.png` | 304 (300 B) | 요청 없음 |
| `/apple-touch-icon-dark.png` | 304 (300 B) | 요청 없음 |
| `/site.webmanifest` | 304 (300 B) | 요청 없음 |

**바이트는 원래도 304 라 나가지 않았다. 줄어든 것은 왕복 횟수 7회다.** 로컬에서는 왕복당 1~7 ms 라 체감되지 않지만, 모바일 네트워크에서는 왕복 하나가 100~300 ms 다.

`/` 가 여전히 304 인 것은 정상이다. `no-cache` 를 준 결과이며, 배포 후 새 자산 파일명을 받아오는 경로다.

## 측정 방법 — 페이지 로드로는 못 잰다

처음에는 페이지를 열고 `performance.getEntriesByType('resource')` 의 `transferSize` 를 읽었다. Before 에서 이런 값이 나왔다.

```
index.js    300 B   (304 재검증)
index.css     0 B   ← max-age=0 인데 왜 요청이 없나
```

**Chrome 의 렌더러 메모리 캐시가 재검증을 건너뛴 것이다.** 새 탭으로 바꿔도 같았다. `<link>` 로 로드되는 서브리소스에서 나타난다.

`fetch()` 로 HTTP 캐시를 직접 태우니 8개 전부 304 가 나왔다. 측정은 이 방식으로 했다.

```
① 8개 URL 을 fetch → 캐시를 채운다
② performance.clearResourceTimings()
③ 같은 8개를 다시 fetch
④ transferSize > 0 이면 네트워크 발생, 0 이면 캐시 적중
```

[S9](../s9-fonts/README.md) 에서 폰트 캐시에 측정이 오염됐던 것과 같은 종류다. **브라우저 캐시를 재는 측정은 브라우저 캐시에 오염된다.**

## 핵심 지표

| 지표 | 값 |
|---|---:|
| 재방문 네트워크 왕복 | **8회 → 1회** |
| 캐시 적중 자산 | 0개 → **7개** |
| `/assets/*` 유효기간 | 0초 → 31,536,000초 + `immutable` |
| 해시 없는 자산 유효기간 | 0초 → 86,400초 |
| `index.html` | `max-age=0` → `no-cache` (의도적 유지) |

## 남은 것

**운영 환경 확인이 필요하다.** 이 측정은 localhost 기준이다. Render 의 프록시가 `Cache-Control` 을 덮어쓰는 경우가 있어, 배포 후 운영 URL 에 같은 `curl` 을 한 번 더 쳐야 한다.

```bash
curl -sI https://telepathy.my/assets/<실제파일명>.js | grep -i cache-control
```

**`feat/tel-31-seo-route-metadata` 와 폴백이 겹친다.** 그 브랜치는 SPA 폴백을 경로별 메타 치환으로 바꿨다. 먼저 머지되는 쪽에 맞춰 폴백의 `setHeader` 위치를 조정해야 한다. `/assets` 와 정적 서빙 블록은 겹치지 않는다.

**존재하지 않는 `/assets/*.js` 에 200 + `index.html` 이 나간다.** 소프트 404 이며 같은 브랜치의 작업 범위라 여기서는 건드리지 않았다.
