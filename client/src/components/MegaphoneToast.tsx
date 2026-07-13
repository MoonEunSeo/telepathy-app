import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MegaphoneShow,
} from '@shared/socketEvents';

interface MegaphoneToastProps {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
}

const MegaphoneToast = ({ socket }: MegaphoneToastProps) => {
  // 이벤트 페이로드 타입은 @shared 소켓 계약에서 자동 추론됨 (annotation 불필요)
  const [megaphoneData, setMegaphoneData] = useState<MegaphoneShow | null>(null);

  useEffect(() => {
    socket.on('megaphone:show', ({ nickname, message }) => {
      setMegaphoneData({ nickname, message });
      setTimeout(() => setMegaphoneData(null), 60000);
    });

    socket.on('megaphone:failed', ({ message }) => {
      alert(message); // 확성기 부족 알림
    });

    return () => {
      socket.off('megaphone:show');
      socket.off('megaphone:failed');
    };
  }, [socket]);

  if (!megaphoneData) return null;

  return (
    <div className="megaphone-toast">
      🔊 <strong>{megaphoneData.nickname}</strong>: {megaphoneData.message}
    </div>
  );
};

export default MegaphoneToast;
