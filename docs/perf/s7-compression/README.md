# S7. 응답 압축 미적용

> 조건: **production build / localhost / 스로틀 없음**
> 측정 대상이 **전송 바이트**이므로 네트워크 스로틀과 무관하다. 시간 지표는 측정하지 않았다.

## 대상 문제

서버에 응답 압축 미들웨어가 없어, 클라이언트가 압축을 지원한다고 알려도 **번들 원본이 그대로 전송된다.**

```
브라우저 ──▶ Accept-Encoding: gzip, deflate, br
Express  ──▶ (헤더를 무시하고 원본 전송)
```

[`server/app.ts`](../../server/app.ts) 에 `compression` 미들웨어가 등록되어 있지 않았고, 정적 서빙(`express.static`)은 압축 기능을 내장하지 않는다.

### S1·S4·S6 과 성격이 다르다

| | 비용의 정체 | 발생 시점 |
|---|---|---|
| S1 중복 호출 | 요청 **왕복 지연** | 화면 이동마다 |
| S4 연타 | 요청 **왕복 지연** | 클릭마다 |
| S6 폴링 | 요청 **건수** | 머문 시간에 비례 |
| **S7 압축** | **전송 바이트** | **첫 로드 1회** |

S1·S4·S6 는 응답이 0.3~0.4 kB 로 작아 페이로드가 아니라 왕복 지연이 비용이다.
S7 은 반대로 **바이트 수 자체가 비용**인 유일한 시나리오다.

## 측정 방법

```bash
npm run build && npm start        # production build, localhost:5000

# 헤더 확인
curl -s -H "Accept-Encoding: gzip, deflate, br" -D - -o /dev/null http://localhost:5000<경로>

# 실제 전송 바이트
curl -s -H "Accept-Encoding: gzip, deflate, br" -o /dev/null -w '%{size_download}' http://localhost:5000<경로>
```

Accept-Encoding 을 `gzip, deflate, br` / `gzip` / (없음) 세 가지로 바꿔가며 측정.

## 결과 (Before)

응답에 `Content-Encoding` 헤더가 **없다.**

```
/assets/index-4Lr1P_-h.js    Content-Length: 515298
/assets/index-B2CHspfy.css   Content-Length: 85274
/                            Content-Length: 3719
```

클라이언트가 `br` 까지 지원한다고 보내도 전송 바이트는 원본과 동일했다.

## 결과 (After)

`app.use(compression())` 등록 후 `Content-Encoding: br` 이 자동 협상됐다.

| 리소스 | Before | After (br) | 절감 |
|---|---:|---:|---:|
| `index-*.js` | 515,298 B | **160,726 B** | **−68.8%** |
| `index-*.css` | 85,274 B | **16,714 B** | **−80.4%** |
| `index.html` | 3,719 B | **1,432 B** | −61.5% |
| **합계** | **604,291 B** | **178,872 B** | **−70.4%** |

### 인코딩별 비교

| Accept-Encoding | 전송 합계 | Content-Encoding |
|---|---:|---|
| `gzip, deflate, br` | 178,872 B | `br` |
| `gzip` | 179,493 B | `gzip` |
| (없음) | 604,291 B | — (원본) |

brotli 와 gzip 차이는 0.3% 수준이며, 브라우저가 지원 범위에 따라 자동 협상한다.
압축 미지원 클라이언트에는 원본이 전송되어 하위 호환이 유지된다.

## 핵심 지표

| 지표 | Before | After | 개선 |
|---|---:|---:|---:|
| 첫 로드 전송량 | **604,291 B** | **178,872 B** | **−425,419 B (−70.4%)** |
| JS 번들 전송량 | 515,298 B | 160,726 B | −68.8% |
| CSS 전송량 | 85,274 B | 16,714 B | −80.4% |
| `Content-Encoding` 응답 | 없음 | `br` / `gzip` | — |

## 분석

**① 텍스트 자산이라 압축률이 높다.**
JS·CSS 는 반복 토큰이 많은 텍스트여서 70~80% 압축된다. CSS 가 80.4% 로 특히 높은 것은
Tailwind 산출물에 유사한 유틸리티 클래스 선언이 반복되기 때문이다.

**② API 응답은 이 변경의 대상이 아니다.**
`compression` 의 기본 임계값은 **1 KB** 이며, 그보다 작은 응답은 압축하지 않는다.
압축 헤더 오버헤드가 절감분보다 커지기 때문이다.

S1·S6 에서 측정된 API 응답은 0.3~0.4 kB 로 전부 임계값 아래다.
→ **S1·S6 의 비용은 이번 변경으로 줄지 않는다.** 두 시나리오는 여전히 캐싱·폴링 조정이 필요하다.

```
S7  첫 로드 전송량   ← 이번 개선
S1  반복 요청 왕복    ← TanStack Query 대상
S6  폴링 요청 건수    ← 주기 조정 / 소켓 push 대상
```

세 축이 겹치지 않으므로 각각 별도로 측정·기록한다.

**③ 비용이 거의 없다.**
소스 변경은 `server/app.ts` 6줄(주석 3줄 포함)이고, 프론트 코드는 건드리지 않았다.
미들웨어 등록 위치를 라우트·정적 서빙보다 **앞**에 두는 것이 유일한 제약이다.

## 측정 시점의 번들 크기 차이

[README](../README.md) 의 측정 환경(기준 커밋 `c9d5d06`)과 번들 크기가 다르다.

| | README 기준 | S7 측정 시점 | 차이 |
|---|---:|---:|---:|
| JS 원본 | 485.8 kB | 515.3 kB | +29.5 kB |
| JS gzip | 152.5 kB | 161.4 kB | +8.9 kB |

차이는 **react-hook-form 도입분**(TEL-9)이다. gzip 기준 +8.9 kB 로, 해당 라이브러리의 알려진 크기와 일치한다.

S7 은 같은 빌드 산출물에 대해 before/after 를 측정했으므로 이 차이가 결과에 영향을 주지 않는다.
다만 S1~S6 의 After 측정 시에는 기준 커밋이 달라진 점을 함께 기록해야 한다.

## 적용 내역

[`server/app.ts`](../../server/app.ts)

```ts
import compression from 'compression';

const app = express();

// ✅ 응답 압축 (gzip/deflate)
// 라우트·정적 서빙보다 먼저 등록해야 API JSON 과 dist 번들이 모두 압축된다.
// 클라이언트가 Accept-Encoding 을 보낼 때만 동작하며, 미지원 시 자동으로 원본을 보낸다.
app.use(compression());
```

## 남은 것

- **브라우저 Network 패널 재확인** — curl 로 측정했으므로, 실제 브라우저에서 Size 열이 동일한지 교차 확인하면 좋다
- **시간 지표 미측정** — 전송량만 측정했다. LCP·FCP 개선폭은 [S5](../README.md)(Lighthouse) 에서 다룬다
- **정적 자산 사전 압축(precompress)** — `vite-plugin-compression` 등으로 빌드 시점에 `.br` 을 생성하면 런타임 CPU 를 아낄 수 있다. 현재 규모에서는 불필요하다고 판단
