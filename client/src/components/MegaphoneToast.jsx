import { useState, useEffect } from "react";

const MegaphoneToast = ({ socket }) => {
  const [megaphoneData, setMegaphoneData] = useState(null);
  
  useEffect(() => {
    socket.on("megaphone:show", ({ nickname, message }) => {
      setMegaphoneData({ nickname, message });
      setTimeout(() => setMegaphoneData(null), 60000);
    });
  
    socket.on("megaphone:failed", ({ message }) => {
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
