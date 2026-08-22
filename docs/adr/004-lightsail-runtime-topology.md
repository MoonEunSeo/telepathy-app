# ADR-004: 초기 운영은 Lightsail 단일 인스턴스와 Docker Compose로 구성

## 상태

수락됨 — 2026-08-22

## 맥락

프론트 분리 후 API/Socket.IO와 Redis를 운영할 실행 환경이 필요하다. 현재 트래픽과 포트폴리오 목적에서는
EC2 Auto Scaling, ECS/Fargate, ElastiCache를 함께 도입하면 고정 비용과 운영 구성요소가 과도하다.

## 결정

- 초기 운영은 AWS Lightsail Linux 인스턴스 한 대를 사용한다.
- Docker Compose로 reverse proxy, API/Socket.IO, Redis를 실행한다.
- Redis 포트는 외부에 공개하지 않는다.
- 애플리케이션 이미지는 GHCR의 immutable Git SHA 태그를 사용한다.
- Supabase PostgreSQL은 기존 외부 영속 데이터 저장소로 유지한다.
- API 다중 인스턴스와 관리형 Redis는 실측 부하·가용성 요구가 생길 때 분리한다.

## 결과

- 낮은 비용으로 Docker, Redis, 배포·롤백 운영 경험을 확보한다.
- 인스턴스 한 대가 API와 Redis의 단일 장애 지점이 된다.
- Redis에는 재생성 가능한 상태만 두므로 인스턴스 장애가 영속 데이터 손실로 이어지지 않는다.
- OS 보안 패치, Docker 업데이트, 디스크·메모리 감시는 직접 관리한다.

## 대안

- Lightsail Container Service: 기반 서버 관리는 줄지만 Redis와 Compose 운영 및 비용 최적화의 유연성이 낮다.
- EC2: 세부 제어는 크지만 현재 단계에서 비용·권한·네트워크 구성이 더 복잡하다.
- ECS/Fargate + ElastiCache: 확장성과 가용성은 높지만 현 규모에 과도하다.
- Render 유지: 가장 간단하지만 프론트 독립 배포와 Redis 운영 포트폴리오 목표를 충분히 충족하지 못한다.

## 승격 조건

아래 중 하나가 실측되면 관리형/다중 노드 구조를 다시 검토한다.

- 단일 인스턴스 CPU 또는 메모리가 지속적으로 70%를 넘는다.
- 배포·장애 중단 시간을 허용할 수 없다.
- 동시 Socket 수 또는 매칭량 때문에 인스턴스 2개 이상이 필요하다.
- Redis 데이터 보호나 자동 장애조치가 제품 요구사항이 된다.
