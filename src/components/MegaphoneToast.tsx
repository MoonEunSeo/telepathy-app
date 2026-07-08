import { useState, useEffect } from "react";
import type {
  AppSocket,
  MegaphoneShowPayload,
  MegaphoneFailedPayload,
} from "../types";

interface MegaphoneToastProps {
  socket: AppSocket;
}

const MegaphoneToast = ({ socket }: MegaphoneToastProps) => {
  const [megaphoneData, setMegaphoneData] = useState<MegaphoneShowPayload | null>(null);

  useEffect(() => {
    socket.on("megaphone:show", ({ nickname, message }: MegaphoneShowPayload) => {
      setMegaphoneData({ nickname, message });
      setTimeout(() => setMegaphoneData(null), 60000);
    });

    socket.on("megaphone:failed", ({ message }: MegaphoneFailedPayload) => {
      alert(message); // 확성기 부족 알림
    });

    return () => {
      socket.off("megaphone:show");
      socket.off("megaphone:failed");
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
