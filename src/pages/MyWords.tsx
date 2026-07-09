import { useEffect, useState } from 'react';
import type { WordHistoryItem, WordHistoryResponse } from '../types';
import styles from '../themes/base/MyWords.module.css';

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
    <div className={styles['my-words-container']}>
      <h2 className={styles['my-words-title']}>누군가와 함께 떠올린 단어</h2>
      <div className={styles['divider-line']} />
      <p className={styles['my-words-subtitle']}>
        이 단어를, 누군가와 함께 떠올렸던 날이 있었어요.
      </p>

      <div className={styles['word-grid']}>
        {wordHistory.length > 0 ? (
          wordHistory.map((item, index) => (
            <div className={styles['word-card']} key={index}>
              <div className={styles['word']}>{item.word}</div>
              <div className={styles['nickname']}>{item.partner_nickname} 님</div>
              <div className={styles['date']}>
                {new Date(item.connected_at).toLocaleDateString('ko-KR', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </div>
            </div>
          ))
        ) : (
          <p className={styles['empty-msg']}>아직 함께 떠올린 단어가 없어요.</p>
        )}
      </div>
    </div>
  );
}
