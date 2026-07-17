import type { MiniGame } from './types';

type Choice = 'A' | 'B';
interface Topic {
  a: string;
  b: string;
}
interface BalanceState {
  phase: 'select' | 'answer' | 'reveal';
  topic: Topic | null; // 확정된 주제 (select 단계에선 null)
  answers: Record<string, Choice>; // userId(문자열) -> 선택 senderId로 키잉
}

const TOPICS: Topic[] = [
  { a: '강아지', b: '고양이' },
  { a: '여름', b: '겨울' },
  { a: '아침형', b: '저녁형' },
  { a: '내향', b: '외향' },
  { a: '짜장면', b: '짬뽕' },
];

export const balanceGame: MiniGame<BalanceState> = {
  gameId: 'balance',
  label: '밸런스 게임',
  icon: '⚖️',
  createInitialState: () => ({ phase: 'select', topic: null, answers: {} }),

  reduce(state, ev, ctx) {
    switch (ev.type) {
      case 'invite': {
        const { topic } = ev.payload as { topic: Topic };
        return { phase: 'answer', topic, answers: {} };
      }
      case 'answer': {
        const { choice } = ev.payload as { choice: Choice };
        // 누가 골랐는지(senderId)로 기록 - 내 emit이든 상대 이벤트든 동일하게 쌓임

        const answers = { ...state.answers, [String(ev.senderId)]: choice };
        const bothAnswered =
          answers[String(ctx.myId)] != null && answers[String(ctx.partnerId)] != null;
        return { ...state, answers, phase: bothAnswered ? 'reveal' : 'answer' };
      }
      default:
        return state;
    }
  },

  render({ state, ctx, emit, close }) {
    const my = state.answers[String(ctx.myId)];
    const partner = state.answers[String(ctx.partnerId)];
    return (
      <div className="modal-overlay">
        {/* 기존 오버레이 재사용 */}
        <div className="w-[320px] rounded-[16px] bg-[var(--color-surface)] p-6 text-center [box-shadow:var(--card-shadow)]">
          <h2 className="mb-4 text-[20px] font-bold">밸런스 게임</h2>
          {/* ── select: 주제 고르기(초대자) ── */}
          {state.phase === 'select' && (
            <>
              <p className="mb-4 text-[var(--color-text-muted)]">주제를 선택하세요</p>
              {TOPICS.map((t) => (
                <button
                  key={t.a}
                  className="mb-2 w-full rounded-[10px] py-3 [border:1px_solid_var(--color-border-subtle)] hover:bg-[var(--color-surface-muted)]"
                  onClick={() => emit('invite', { topic: t })}
                >
                  {t.a} vs {t.b}
                </button>
              ))}
              {/* close = 내 서피스만 닫음(로컬) */}
              <button className="mt-1 w-full py-2 text-[var(--color-text-muted)]" onClick={close}>
                취소
              </button>
            </>
          )}

          {/* ── answer: 주제 확정, A/B 고르기 ── */}
          {state.phase === 'answer' && state.topic && (
            <>
              <p className="mb-4 font-semibold">
                {state.topic.a} vs {state.topic.b}
              </p>
              {!my ? (
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-[10px] py-4 [border:1px_solid_var(--color-border-subtle)]"
                    onClick={() => emit('answer', { choice: 'A' })}
                  >
                    {state.topic.a}
                  </button>
                  <button
                    className="flex-1 rounded-[10px] py-4 [border:1px_solid_var(--color-border-subtle)]"
                    onClick={() => emit('answer', { choice: 'B' })}
                  >
                    {state.topic.b}
                  </button>
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)]">상대방 선택을 기다리는 중…</p>
              )}
            </>
          )}

          {/* ── reveal: 결과 ── */}
          {state.phase === 'reveal' && state.topic && (
            <>
              <p className="mb-3 font-semibold">
                {state.topic.a} vs {state.topic.b}
              </p>
              <p>
                나 → <b>{my === 'A' ? state.topic.a : state.topic.b}</b>
              </p>
              <p>
                {ctx.partnerNickname} → <b>{partner === 'A' ? state.topic.a : state.topic.b}</b>
              </p>
              <p className="my-3 text-[18px]">
                {my === partner ? '취향이 같네요! 🎉' : '취향이 다르네요 😆'}
              </p>
              <button
                className="w-full rounded-[10px] py-2 text-[var(--color-on-accent)] [background:var(--color-accent)]"
                onClick={close}
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>
    );
  },
};
