# chat — 채팅 세션·메시지

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-23(2-3) · TEL-7 · TEL-11

---

## 1. 문제 — 메시지 한 줄에 모든 것이 들어 있다

`chat_logs` 한 행이 `room_id`·보낸사람·받는사람·닉네임·단어를 전부 갖는다. **방이라는 개념이 테이블로 존재하지 않고 `room_id` 문자열로만 암시된다.**

```
chat_logs  →  chat_sessions         방 자체 (status · 시작·종료 시각)
              chat_session_members   누가 참여했나 (actor_id)
              chat_messages          무엇을 말했나
```

**단순 컬럼 대응이 아니다.** 방을 먼저 만들고, 참여자를 붙이고, 그 다음에야 메시지를 넣을 수 있다.

**매칭(TEL-22) 완료 후 착수한다** — 채팅 세션이 매칭 성사 지점(`join_match`)에서 생성되기 때문이다.

---

## 2. 범위 — `chat.socket.ts` 의 핸들러

같은 파일의 `join_match` 는 매칭(TEL-22), `megaphone:send` 는 결제(TEL-25) 담당이다.

| 이벤트 | 처리 |
|---|---|
| `chatMessage` | `chat_messages` INSERT + **방 참여자 검증** |
| `typing`·`stopTyping` | 상태 전달만 — DB 무관 |
| `game:event` | 밸런스게임 이벤트 중계 |
| `leaveRoom`·`disconnecting` | `chat_sessions.status` 종료 전이 |
| `onlineCount` | 접속 수 — DB 무관 |

---

## 3. 착수 전 확인

### `chat_sessions.status` DEFAULT 가 `'ENDED'` 다
status 를 빠뜨리면 **새 방이 조용히 "종료" 상태로 만들어진다.** TEL-22 에서 `'READY'` 로 교정하는 마이그레이션을 넣기로 했으니 **적용 여부를 먼저 확인**한다.

### `balance_game_choices`·`session_reconnect_grants` 가 단일 FK 다
다른 두 테이블은 복합 FK 로 막고 있는데 이 둘은 **교차 세션 참조가 통과한다** — **A 방의 선택이 B 방을 가리켜도 DB 가 막지 않는다.** 앱에서 방어하거나 제약을 복합 FK 로 올린다.

### 보낸 사람을 신뢰하지 않는다
`chat_messages` 는 `chat_session_members` 를 거쳐 actor 를 참조한다. **소켓에서 온 발신자를 믿지 말고 세션 멤버십으로 확인한다.** 레거시는 클라이언트가 보낸 `senderId` 를 그대로 썼다 — 신고 처리의 증거 데이터인 `chat_logs` 를 남의 이름으로 위조할 수 있었다(TEL-7).

> **DB 저장(insert)과 중계(emit)는 별개 경로다** (TEL-7 §3.9). 저장만 고치면 기록은 깨끗해도 **상대 화면에는 위조된 이름이 표시된다.** 브로드캐스트도 서버 확정 신원으로 덮어써야 한다.

---

## 4. 이관된 데이터를 믿지 말 것

- cutover 리허설에서 **시작·종료 시각이 전부 NULL 인 방**이 있어 `created_at` NOT NULL 을 위반했다. `coalesce(..., now())` 로 넘겼다. **레거시 데이터가 시각을 보장하지 않는다** — 이관된 세션을 읽을 때 시각이 있다고 가정하지 않는다.
- **매칭 기록 없는 채팅방 116개**(메시지 2,221건 = 전체의 27.2%). `telepathy_sessions_queue`·`_log` 어디에도 매칭 기록이 없는데 대화는 실제로 오갔다. **queue/log 만 기준으로 이전했으면 채팅의 27%가 유실**될 뻔했다 → §33 의 "`chat_logs.room_id` 최우선" 원칙이 데이터로 입증됨.
- 이관 실적: `chat_messages` **8,226행** (레거시와 정확히 일치). 게스트 미이전 결정으로 메시지 172건·세션 38개가 최종 제외됐다.
- `room_id` 타입이 레거시에서 uuid/text/varchar 혼용이었다 → V2 는 **uuid 로 통일**.

---

## 5. 큐와 채팅 세션의 수명이 다르다 (O14) — 중복 기재

**채팅은 라운드(15초)보다 오래 산다.** 그래서 라운드 만료 청소가 `matched` 행까지 지우면 종료 처리(`status='ended'`)가 대상 행을 잃는다. 0건 갱신되는데 **Supabase 는 이걸 오류로 주지 않는다.**

TEL-18 이 청소 대상을 `waiting` 만으로 좁혀 증상을 막았고, **근본 해결이 이 이슈(`chat_sessions` 분리)** 다. → [matching.md](matching.md) §4.2

---

## 6. 완료 조건

1. `chat.socket.ts` 에 `chat_logs` 참조가 없다
2. 방 생성 → 대화 → 종료가 3테이블에 정합하게 남는다
3. 종료된 세션의 `status` 가 `'ENDED'` 이고 **새 세션은 그렇지 않다**
4. **다른 방 참여자가 메시지를 넣을 수 없다** (검증 스크립트로 시도·차단 확인)
5. `scripts/check-chat-flow.ts` 추가
