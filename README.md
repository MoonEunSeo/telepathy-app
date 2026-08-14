# 텔레파시

같은 단어를 떠올린 사람끼리 익명으로 대화하는 랜덤 채팅 서비스입니다.

운영 중이던 JavaScript 서비스를 단독으로 인계받아 TypeScript 전환과 구조 재설계를 진행하고 있습니다.

- 개발 기간: 2026.07. ~ 진행 중
- 인원: 1인 개발 전담 (기획 1인 별도)
- [GitHub](https://github.com/MoonEunSeo/telepathy-app/tree/v3) · [서비스](https://telepathy.my/) · [관련 뉴스](https://platum.kr/archives/272577)

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript, TanStack Query, Tailwind CSS v4 |
| Backend | Express 5, Socket.io, Zod |
| Database | Supabase, PostgreSQL RPC |
| Deploy | Render |

## 프론트엔드

### 디자인 및 UI 구현

Claude Design으로 화면 디자인을 진행하고, Tailwind CSS v4 기반으로 공통 스타일을 맞춰 구현했습니다.

### 폼 리렌더 제거

로그인, 회원가입 등 기존 폼을 React Hook Form으로 전환해 타이핑 중 리렌더링을 제거했습니다.

### 서버 데이터 캐시 및 경쟁 상태 차단

- TanStack Query 공용 캐시를 도입해 화면 이동 시 중복 요청을 제거했습니다.
- 즐겨찾기 버튼에 낙관적 업데이트와 요청 직렬화를 적용했습니다.

### 라우트 코드 스플리팅

정적 import하던 단일 번들을 라우트 단위 `lazy`로 분할했습니다.

- 초기 JavaScript 전송량: 171 kB → 122 kB (gzip 기준 29% 감소)

### 웹폰트 자체 호스팅

외부 폰트 오리진 2곳을 제거하고 `woff2`를 직접 호스팅했습니다.

- LCP: 3,442 ms → 2,266 ms
- Lighthouse: 82 → 97

### 이미지 자산 최적화

- 파비콘을 벡터 SVG로 교체: 485 kB → 666 B
- 테마 배경 및 OG 이미지 재인코딩: 643 kB → 134 kB
- 프로필 및 QR 이미지 재인코딩: 132 kB → 7.2 kB

## 백엔드

### Supabase RPC 기반 트랜잭션 및 데이터 정합성

회원가입, 닉네임 변경, 탈퇴처럼 여러 테이블을 동시에 바꾸는 연산을 PostgreSQL 함수(RPC)로 옮겨 롤백 트랜잭션을 구현했습니다.

또한 공통 응답 규약을 도입하고, Zod로 서버 입력 검증을 단일화했습니다.

### DB 재설계 및 정규화

한 테이블이 여러 도메인을 함께 담아 중복 저장과 빈 컬럼이 쌓이던 구조를 도메인 단위로 나누어 정규화했습니다.

### 응답 압축

gzip/brotli 응답 압축을 적용했습니다.

- 첫 로드 전송량: 604 KB → 179 KB (70% 감소)

### 검색엔진 색인 정비

`react-helmet` 대신 서버 측 메타 치환을 도입하고, 미등록 경로 404 처리와 진입점 통합을 적용했습니다.
