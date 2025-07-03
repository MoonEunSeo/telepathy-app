import { useEffect, useState } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';

export default function WordTimer({ word, displayedText, onExpire }) {
  const { startTime } = useWordSession();
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (!startTime) return;

    const update = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) onExpire();
    };

    update(); // 즉시 실행으로 초기 상태 반영
    const intervalId = setInterval(update, 1000);

    return () => clearInterval(intervalId);
  }, [startTime, onExpire]); // onExpire 포함 → 안정성 확보

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const isIntentWord = word?.endsWith('_밸');

  return (
    <div className="word-timer-group">
      <div className="word-timer">
        {isIntentWord
          ? displayedText
          : `입력한 단어 : ${displayedText}`}
      </div>
      <div className="word-timer-time">{formatTime(timeLeft)}</div>
    </div>
  );
}
