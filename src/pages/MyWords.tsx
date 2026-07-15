import { useEffect, useState } from 'react';
import type { WordHistoryItem, WordHistoryResponse } from '../types';

export default function MyWords() {
  const [wordHistory, setWordHistory] = useState<WordHistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/word-history', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('서버 응답 실패');
        }

        const data = (await res.json()) as WordHistoryResponse;
        console.log('📦 받은 데이터:', data);

        if (Array.isArray(data.history)) {
          setWordHistory(data.history);
        } else {
          console.warn('⚠️ history가 배열이 아님:', data);
          setWordHistory([]);
        }
      } catch (err) {
        console.error('❌ 단어 기록 불러오기 실패:', (err as Error).message);
        setWordHistory([]);
      }
    };

    fetchHistory();
  }, []);

  return (
    /* 구 .my-words-container */
    <div className="min-h-screen bg-[#fdfaf6] p-5 [font-family:'Gowun_Batang',serif]">
      <h2 className="mb-1 text-[1.1rem] font-bold text-[var(--color-text)]">
        누군가와 함께 떠올린 단어
      </h2>
      {/* 구 .divider-line (div) */}
      <div className="my-6 [border-top:1px_solid_var(--color-border-strong)]" />
      <p className="mb-5 text-[0.9rem] text-[var(--color-text-secondary)]">
        이 단어를, 누군가와 함께 떠올렸던 날이 있었어요.
      </p>

      {/* 구 .word-grid */}
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(45%,1fr))] gap-4">
        {wordHistory.length > 0 ? (
          wordHistory.map((item, index) => (
            /* 구 .word-card */
            <div
              className="flex min-h-[100px] flex-col justify-between rounded-[18px] bg-[var(--color-surface)] p-4 [box-shadow:0_4px_10px_rgba(0,0,0,0.05)] [transition:transform_0.2s_ease] hover:-translate-y-0.5"
              key={index}
            >
              <div className="mb-1 text-base font-bold text-[var(--color-text-strong)]">
                {item.word}
              </div>
              <div className="mb-1 text-[0.85rem] text-[var(--color-text-secondary)]">
                {item.partner_nickname} 님
              </div>
              <div className="text-right text-[0.75rem] text-[var(--color-text-faint)]">
                {new Date(item.connected_at).toLocaleDateString('ko-KR', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="mt-5 text-[0.85rem] text-[var(--color-text-faint)]">
            아직 함께 떠올린 단어가 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
