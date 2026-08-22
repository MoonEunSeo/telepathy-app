# ADR-003: Capacitor 번들 및 인증 전략

## 상태

수락됨 — 2026-08-22

## 맥락

현재 프론트는 상대 `/api`와 `window.location.origin`을 사용하고 HttpOnly `SameSite=Lax` 쿠키에
의존한다. Capacitor WebView는 로컬 origin에서 실행되므로 이 방식으로 원격 API와 Socket에 연결할 수 없다.

## 결정

- 운영 앱은 Vite 산출물을 앱에 포함하고 원격 `server.url`을 사용하지 않는다.
- 웹과 앱 모두 명시적인 API/Socket 환경 설정을 사용한다.
- 웹 인증은 기존 HttpOnly 쿠키를 유지한다.
- 앱 인증은 짧은 access token과 회전 가능한 refresh token을 사용한다.
- 앱 refresh token은 Android Keystore/iOS Keychain 기반 안전한 저장소에 둔다.
- Socket.IO는 웹의 쿠키 또는 앱의 handshake auth token을 모두 처리한다.
- 서버의 사용자 해석 로직은 두 전달 방식을 하나의 검증 함수로 통합한다.

## 결과

- WebView의 서드파티 쿠키 정책에 의존하지 않는다.
- 서버는 웹·앱 두 인증 전달 방식을 지원해야 한다.
- 앱 버전은 웹처럼 즉시 갱신되지 않으므로 API 하위 호환과 최소 앱 버전 정책이 필요하다.

## 대안

- `SameSite=None` 쿠키만 사용: WebView 정책과 CSRF 위험 때문에 제외했다.
- 운영 사이트 원격 로딩: Capacitor의 로컬 번들 모델과 앱 심사·오프라인 시작 경험에 불리해 제외했다.
- 앱 토큰을 localStorage에 저장: 탈취 위험 때문에 제외했다.

## 검증 기준

- 웹 쿠키 인증 회귀 테스트가 통과한다.
- Android에서 로그인·앱 재시작·토큰 갱신·로그아웃을 검증한다.
- 앱이 백그라운드 복귀 후 Socket 인증과 60초 재접속을 완료한다.
- 로그와 오류 응답에 토큰이 노출되지 않는다.
