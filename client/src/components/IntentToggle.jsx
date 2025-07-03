import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import '../index.css';

export default function IntentToggle() {
  const navigate = useNavigate();
  const [polling, setPolling] = useState(false);

  const options = [
    {
      key: 'A',
      label: '누군가에게 위로받고 싶어요.',
      color: '#fddede',
      word: 'comfort',
    },
    {
      key: 'B',
      label: '누군가를 위로하고 싶어요.',
      color: '#fde8de',
      word: 'comfort',
    },
    {
      key: 'L',
      label: '누군가와 가볍게 연결되고 싶어요.',
      color: '#e4f1ff',
      word: 'light',
    },
  ];

  const handleStartIntent = async (role, word) => {
    try {
      const res = await fetch('/api/balance-game/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, word }),
      });
      const data = await res.json();

      if (data.success) {
        toast.info('매칭을 기다리고 있어요...');
        setPolling(true);
      } else {
        toast.error('매칭 요청 실패');
      }
    } catch (err) {
      console.error('❌ 매칭 요청 오류:', err);
      toast.error('서버 오류로 매칭에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/balance-game/check', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();

        if (data.success && data.matched) {
          clearInterval(interval);
          setPolling(false);

          try {
            // ✅ 현재 클라이언트 쿠키에서 JWT 토큰 추출
            const token = document.cookie
              .split('; ')
              .find(row => row.startsWith('token='))
              ?.split('=')[1];
            if (!token) throw new Error('JWT 토큰 누락');

            const decoded = jwtDecode(token);
            const currentUserId = decoded.user_id;

            // ✅ 내 ID가 서버의 myId인지 partnerId인지 판단
            const iAmMy = data.myId === currentUserId;
            const myId = iAmMy ? data.myId : data.partnerId;
            const myNickname = iAmMy ? data.myNickname : data.partnerNickname;
            const partnerId = iAmMy ? data.partnerId : data.myId;
            const partnerNickname = iAmMy ? data.partnerNickname : data.myNickname;

            console.log('navigate to chat with:', {
              myId, myNickname, partnerId, partnerNickname, roomId: data.roomId, word: data.word
            });

            navigate(
              `/chatpage2/${data.roomId}/${myId}/${encodeURIComponent(myNickname)}/${partnerId}/${encodeURIComponent(partnerNickname)}/${encodeURIComponent(data.word)}`
            );
          } catch (err) {
            console.error('❌ navigate 시 JWT 검증 오류:', err);
            toast.error('인증 정보 확인 실패');
            navigate('/main');
          }
        }
      } catch (err) {
        console.error('❌ 매칭 확인 오류:', err);
        clearInterval(interval);
        setPolling(false);
        toast.error('서버 오류로 매칭 확인에 실패했습니다.');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, navigate]);

  return (
    <div className="intent-toggle-wrapper">
      {options.map(({ key, label, color, word }) => (
        <button
          key={key}
          className="intent-button"
          style={{ backgroundColor: color }}
          onClick={() => handleStartIntent(key, word)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
