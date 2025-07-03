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
      if (remaining <= 0) {
        onExpire();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, onExpire]);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };


  // ✅ intent 기반 word인지 확인 (_밸로 끝나는지)
  const isIntentWord = word?.endsWith('_밸');

  return (
    <div className="word-timer-group">
      <div className="word-timer">
        {isIntentWord
          ? displayedText
          : `입력한 단어 : ${displayedText}`} {/* 자연스럽게! */}
      </div>
      <div className="word-timer-time">{formatTime(timeLeft)}</div>
    </div>
  );
}