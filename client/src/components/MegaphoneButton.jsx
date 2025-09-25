import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import "./MegaphoneButton.css";
import MegaphoneInputModal from "./MegaphoneButton.css";

const MegaphoneButton = ({ socket, megaphoneCount }) => {
  const [showIntro, setShowIntro] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const introSeen = localStorage.getItem("megaphoneIntroShown");
    if (!introSeen) setShowIntro(true);
  }, []);

  const handleClick = () => {
    if (megaphoneCount === 0) setShowStore(true);
    else setShowInput(true);
  };

  return (
    <>
      <button onClick={handleClick}>
        <Megaphone size={22} />
      </button>

      {/* 안내 모달 */}
      {showIntro && (
        <div className="modal">
          <p>1분간 접속한 다른 사람들에게 내가 입력한 값을 전달할 수 있어요!</p>
          <button onClick={() => {
            setShowIntro(false);
            localStorage.setItem("megaphoneIntroShown", "true");
          }}>확인</button>
        </div>
      )}

      {/* 구매 모달 */}
      {showStore && (
        <div className="modal">
          <p>확성기가 없습니다. 구매해주세요.</p>
          <button onClick={() => buyMegaphone(1)}>1회권</button>
          <button onClick={() => buyMegaphone(5)}>5회권</button>
          <button onClick={() => buyMegaphone(10)}>10회권</button>
        </div>
      )}

      {/* 입력 모달 */}
      {showInput && (
        <MegaphoneInputModal 
          socket={socket} 
          onClose={() => setShowInput(false)} 
        />
      )}
    </>
  );
};

export default MegaphoneButton;
