# 서버 배포 단위 분리 계획

## 목표

Express의 웹 정적 제공을 전환 가능하게 만들고 REST·Socket.IO의 CORS 설정을 통합한 뒤,
프론트 산출물이 없는 백엔드 컨테이너와 로컬 Redis 기반을 구성한다.

## 단계

1. 서버 런타임 환경변수 검증과 공통 origin delegate 구현
2. HTTP 앱 팩토리 분리, 정적 제공 토글과 readiness 추가
3. 백엔드 전용 Dockerfile과 로컬 Compose 구성
4. 회귀 테스트와 문서 동기화
5. 전체 저장소 검증
