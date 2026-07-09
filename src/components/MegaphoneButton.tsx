import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";

import type { AppSocket } from "../types";
import { getStorage, setStorage } from "../types";
import MegaphoneInputModal from "./MegaphoneInputModal";
import styles from "../themes/base/MegaphoneButton.module.css";

interface MegaphoneButtonProps {
  socket: AppSocket;
  megaphoneCount: number;
}

const MegaphoneButton = ({ socket, megaphoneCount }: MegaphoneButtonProps) => {
  const [showIntro, setShowIntro] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const introSeen = getStorage("megaphoneIntroShown");
    if (!introSeen) setShowIntro(true);
  }, []);

  const handleClick = () => {
    if (megaphoneCount === 0) setShowStore(true);
    else setShowInput(true);
  };

  // TODO: 원본에 정의 안 된 함수 — 구매 로직 연결 필요
  // (requestPayment util 은 userId 가 필요하지만 MegaphoneButton 에는 userId prop 이 없음)
  const buyMegaphone = (count: number) => {
    console.log(`확성기 ${count}개 구매 요청`);
  };

  // 확성기 메시지 전송 핸들러.
  // 원본은 socket 을 모달에 넘겼지만 모달이 이를 무시했고, 실제 전송 경로(MainPage)는
  // onSend → socket.emit('megaphone:send') 이므로 동일 패턴으로 연결한다.
  const handleSend = (value: string) => {
    // TODO: userId 소스 없음(MegaphoneButton 은 userId prop 미보유) — 실제 사용 시 userId 주입 필요
    socket.emit("megaphone:send", { userId: "", message: value });
    setShowInput(false);
  };

  return (
    <>
      <button onClick={handleClick}>
        <Megaphone size={22} />
      </button>

      {/* 안내 모달 */}
      {showIntro && (
        <div className={styles.modal}>
          <p>1분간 접속한 다른 사람들에게 내가 입력한 값을 전달할 수 있어요!</p>
          <button
            onClick={() => {
              setShowIntro(false);
              setStorage("megaphoneIntroShown", "true");
            }}
          >
            확인
          </button>
        </div>
      )}

      {/* 구매 모달 */}
      {showStore && (
        <div className={styles.modal}>
          <p>확성기가 없습니다. 구매해주세요.</p>
          <button onClick={() => buyMegaphone(1)}>1회권</button>
          <button onClick={() => buyMegaphone(5)}>5회권</button>
          <button onClick={() => buyMegaphone(10)}>10회권</button>
        </div>
      )}

      {/* 입력 모달 */}
      {showInput && (
        <MegaphoneInputModal
          hasMegaphone={megaphoneCount > 0}
          onSend={handleSend}
          onClose={() => setShowInput(false)}
        />
      )}
    </>
  );
};

export default MegaphoneButton;
