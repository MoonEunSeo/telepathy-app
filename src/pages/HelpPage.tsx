import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FrameIcon from "../assets/sasinamu.svg";
import Telpa from "../assets/telpa.svg";
import Want_to from "../assets/want_to.svg";
import Want_from from "../assets/want_from.svg";
import Emotion from "../assets/Emotion_Feedback.svg";
import Alert from "../assets/alert.svg";
import Searchbar from "../assets/searchbar.svg";
import Remember from "../assets/remember.svg";

// 구 .section (프로세 스타일 — h2/h3/p/li 자손을 자식 셀렉터 유틸로) — 3곳 반복
const section =
  "[&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:[border-bottom:1px_solid_#7d6c5f] [&_h2]:pb-1.5 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:[font-family:'Gowun_Dodum'] " +
  "[&_h3]:flex [&_h3]:justify-center [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:mt-[70px] [&_h3]:mb-[30px] " +
  "[&_p]:text-center [&_p]:text-[16px] [&_p]:mt-10 [&_p]:mb-5 [&_p]:leading-[1.7] [&_p]:text-[#f6ede7] " +
  "[&_li]:text-center [&_li]:text-[16px] [&_li]:mt-10 [&_li]:mb-5 [&_li]:leading-[1.7] [&_li]:text-white";
// 구 .centered / .centered_1
const centered = "flex justify-center flex-col mt-8 mb-[42px]";
const centered1 = "flex justify-center mt-[5px] mb-[5px]";

export default function HelpPage() {
  useEffect(() => {
    // 페이지 들어올 때 할로윈 모드 제거
    document.body.classList.remove("halloween-mode");
  }, []);

  const navigate = useNavigate();

  return (
    /* 구 .fullBackground */
    <div className="bg-[#3a3020] min-h-screen flex justify-center">
      {/* 구 .helpContainer */}
      <div className="bg-[#3a3020] [font-family:'Gowun_Dodum','Gowun_Batang',sans-serif] text-[#f6ede7] py-8 px-5 max-w-[430px] mx-auto">
        {/* 구 .button */}
        <button className="inline-block bg-[#d7bfae] text-[#3a2a20] py-2.5 px-4 rounded-[20px] text-[14px] m-[6px_6px_10px_0] [font-family:'Gowun_Dodum'] border-none [box-shadow:1px_2px_5px_rgba(0,0,0,0.2)] cursor-pointer hover:bg-[#e6cfc0]" onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>

        {/* 구 .title */}
        <h1 className="[font-family:'Judson',serif] text-[60px] text-center mt-10 mb-5 text-white">Telepathy</h1>
        {/* 구 .subtitle */}
        <p className="text-[16px] text-center text-[#ffeedd] mt-5 mb-10">당신이 궁금해하실 법한 이야기들을 모아봤어요.</p>

        <div className={section}>
          <h2>1. 텔레파시의 철학</h2>

          <strong>| 우리는 감정이 연결의 시작이라고 믿어요. |</strong>
          <p>'텔레파시'는 같은 단어를 떠올린 사람끼리</p>
          <p>익명으로 대화할 수 있는 감정 기반 소셜 플랫폼이에요.</p>
          <p>말하지 않아도, 느낌으로 전해지는 연결을 만들어요.</p>
        </div>

        <div className={section}>
          <h2>2. 주요 기능 안내</h2>
          <h3>| 단어 매칭 |</h3>
          <div className={centered}>
            <img src={Searchbar} alt="검색바" />
          </div>
          <p>같은 단어를 입력한 사람과</p>
          <p>실시간으로 연결되는 기능이에요.</p>
          <h3>| 단어 취소 방법 |</h3>
          <div className={centered}>
            <img src={FrameIcon} alt="사시나무라는 단어를 전송했어요" />
          </div>
          <p>전송된 단어 위에서 꾹 누르면 입력이 취소돼요.</p>

          <h3>| 텔파 |</h3>
          <div className={centered}>
            <img src={Telpa} alt="오늘의기분은어땟나요?" />
          </div>
          <p>연결되기까지의 지루한 기다림 속,</p>
          <p>텔파와 간단히 소통해보세요.</p>

          <h3>| 알림기능 |</h3>
          <div className={centered}>
            <img src={Alert} alt="알림로고" />
          </div>

          <h3>| 감정 밸런스 게임 |</h3>
          <div className={centered}>
            <div className={centered1}>
              <img src={Want_to} alt="위로하고싶어요" />
            </div>
            <div className={centered1}>
              <img src={Want_from} alt="위로받고싶어요" />
            </div>
          </div>
          <p>마땅히 떠오르는 단어가 없어 곤란한가요?</p>
          <p>두 가지 선택지 중 하나를 고르면 연결될 수 있어요!</p>

          <h3>| 감정 피드백 |</h3>
          <div className={centered}>
            <img src={Emotion} alt="감정피드백" />
          </div>
          <p>대화 중 들은 감정을 공유해보세요.</p>
          <p>익명으로 전달되는 감정은</p>
          <p>서로에게 따뜻한 여운을 남겨요.</p>

          <h3>| 단어 기록 |</h3>
          <div>
            <div className={centered}>
              <img src={Remember} alt="곤약젤리" />
            </div>
          </div>
          <p>우리가 지금, 똑같은 단어를 입력했다는 건</p>
          <p>마치 기적같은 일이에요.</p>
          <p>당신의 빛났던 순간을 텔레파시가 간직해드려요.</p>
          <p>
            기록된 단어는 <span className="text-[#ff5e5e]">삭제</span>가 어려우니, 이점 꼭 기억해 주세요.
          </p>
        </div>

        <div className={section}>
          <h2>3. 이 앱은 이런 사람에게 추천해요</h2>
          <ul>
            <li>익명의 누군가와 조용히 대화를 나누고 싶은 사람</li>
            <li>내 감정을 같이 설명하지 않고도 공감받고 싶은 사람</li>
            <li>말보다는 느낌이 먼저 오는 대화를 원했던 사람</li>
          </ul>
          <h2></h2>
          <p>🔦 이 앱에 대한 개선 아이디어가 있으신가요?</p>
          <p>텔레파시는 당신의 의견이 필요해요.</p>
          <p>
            Contact : <span className="bg-[#d9c8b2] text-[#3c2f27] rounded-[10px] py-2.5 px-3.5 text-[13px] [box-shadow:0_2px_4px_rgba(0,0,0,0.2)] m-[6px_6px_6px_0] inline-block">telepathy.cs@gmail.com</span>
          </p>
          <div className={centered}>
            <strong>당신의 낭만적인 연결을, 텔레파시에서 느껴보세요.</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
