# S12. 엣지 캐시 — 예측이 빗나간 기록

> 조건: **운영(`https://telepathy.my`) / `curl` / Render `telepathy-app` 서비스**
> 결론부터: **개선하지 못했다.** 무료 플랜에는 엣지 캐시 기능 자체가 없다.

## 무엇을 하려 했나

[S10](../s10-cache-headers/README.md) 에서 `/assets` 에 `max-age=31536000, immutable` 을 줬는데, 운영에서 `cf-cache-status` 가 계속 `DYNAMIC` 이었다. 브라우저 캐시에는 먹지만 엣지에는 안 먹는다는 뜻이다.

첫 방문자는 여전히 Render 원본까지 간다. 엣지는 인천(ICN)인데 원본 TTFB 가 165~215 ms 다.

## 잘못 짚은 원인

응답 헤더에 이런 것이 있었다.

```
vary: Origin, Accept-Encoding
access-control-allow-credentials: true
cf-cache-status: DYNAMIC
```

`app.use(cors(...))` 에 경로가 없어 정적 파일에도 `Vary: Origin` 이 붙고 있었다. **Cloudflare 는 `Vary` 가 `Accept-Encoding` 이 아니면 캐시하지 않는다.** 설명이 맞아떨어져 이것을 원인으로 단정하고 [#27](https://github.com/MoonEunSeo/telepathy-app/pull/27) 을 올렸다.

배포 후 결과다.

| 항목 | 예측 | 실제 |
|---|---|---|
| `vary` | `Accept-Encoding` | ✅ `Accept-Encoding` |
| `cf-cache-status` (2회차) | `HIT` | ❌ **`DYNAMIC`** |
| TTFB | 감소 | ❌ **변화 없음** (185~215 ms) |

## 진짜 원인

**이 Cloudflare 는 우리 것이 아니다.** Render 가 자사 서비스 앞단에 두는 것이다.

| | `telepathy-app.onrender.com` | `telepathy.my` |
|---|---|---|
| `Server` | cloudflare | cloudflare |
| `CF-RAY` | …-ICN | …-ICN |
| `cf-cache-status` | DYNAMIC | DYNAMIC |
| `x-render-origin-server` | Render | Render |

`telepathy.my` 는 `216.24.57.1` — Render 의 anycast IP 로 향한다. 두 도메인의 헤더와 동작이 같다. 사용자 소유 Cloudflare 존이 아니라 **대시보드도 없다.**

[Render 문서](https://render.com/docs/web-service-caching)에 답이 있었다.

> Edge caching is **not available for free web services**. It requires a paid instance type.

유료라도 대시보드에서 **"Cacheable file types" 를 명시적으로 켜야** 한다.

`telepathy-app` 서비스는 `plan: free`, 리전 `oregon` 이다. **무료 플랜에는 기능 자체가 없으므로 헤더를 어떻게 만들어도 `DYNAMIC` 이다.**

## 무엇을 잘못했나

**기능이 존재하는지부터 확인했어야 했다.** 헤더에서 `Vary: Origin` 을 발견하자마자 원인으로 단정했다. 설명이 그럴듯했기 때문인데, 플랜 티어를 먼저 봤으면 30초에 끝났을 확인이다.

`Vary` 제거는 **필요조건이었지만 충분조건이 아니었다.**

> 헤더가 그럴듯한 설명을 제공할 때가 가장 위험하다. 고치기 전에 **그 기능이 이 환경에서 제공되는지**를 먼저 본다.

## #27 이 남긴 것

목표는 못 이뤘지만 버릴 커밋은 아니다.

| | |
|---|---|
| **preflight 설정 불일치 수정** | `app.options(/.*/, cors())` 가 인자 없는 `cors()` 라 `ACAO: *` 를 내보내고 `credentials` 가 빠져 있었다. 브라우저가 거부하는 조합이며, preflight 가 필요한 요청에서 어긋나 있었다 |
| 죽은 코드 제거 | `index.ts` 의 도달 불가 `app.use(cors(...))` |
| 정적 자산 헤더 정리 | 공개 파일에 `access-control-*` 가 붙지 않는다 |
| 유료 전환 시 전제조건 | `Vary: Origin` 이 남아 있으면 엣지 캐시를 켜도 먹지 않는다 |

## 현재 상태

| 항목 | 값 |
|---|---|
| `Cache-Control` (`/assets/*`) | `public, max-age=31536000, immutable` |
| `vary` | `Accept-Encoding` |
| `cf-cache-status` | `DYNAMIC` (무료 플랜, 변경 불가) |
| TTFB (`/assets/index-*.js`, 5회) | 187 / 193 / 203 / 214 / 267 ms |
| TTFB (`/favicon.svg`, 5회) | 164 / 181 / 183 / 207 / 423 ms |

브라우저 캐시는 정상 동작한다 — 재방문 왕복 8회 → 1회는 [S10](../s10-cache-headers/README.md) 그대로 유효하다. **엣지만 안 걸린다.**

## 남은 것

**Render 유료 전환** — 월 $7 부터. 엣지 캐시와 콜드스타트 제거가 함께 온다. 비용 결정이라 성능 판단만으로 정하지 않는다. 전환하면 대시보드에서 "Cacheable file types" 를 켜야 하고, 그때 이 문서의 측정을 그대로 다시 돌리면 된다.

**폰트 self-host 는 이 결과와 독립적으로 진행한다.** 근거가 "우리 서버가 더 빠르다"가 아니라 **"폰트를 훨씬 일찍 요청한다"** 이기 때문이다.

| | 폰트 요청 시작 |
|---|---:|
| 지금 (렌더 후에야 필요를 발견) | ~1,290 ms |
| self-host + `preload` | ~10 ms |

파일당 TTFB 는 Render 원본이 gstatic 보다 40~60 ms 불리하지만, 요청 시점을 1,280 ms 앞당기는 효과가 그보다 크다. 이미 열린 HTTP/2 연결을 재사용하므로 gstatic 의 새 핸드셰이크(40~67 ms, 모바일에서는 더 큼)도 발생하지 않는다.
