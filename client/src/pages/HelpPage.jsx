import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HelpPage.module.css";
import FrameIcon from '../assets/sasinamu.svg';
import Telpa from '../assets/telpa.svg';
import Want_to from '../assets/want_to.svg';
import Want_from from '../assets/want_from.svg';
import Emotion from '../assets/Emotion_Feedback.svg'
import Alert from '../assets/alert.svg'
import Searchbar from '../assets/searchbar.svg'
import Remember from '../assets/remember.svg'


export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.fullBackground}>
    <div className={styles.helpContainer}>
      <button className={styles.button} onClick={() => navigate(-1)}>
        ← 돌아가기
      </button>

      <h1 className={styles.title}>Telepathy</h1>
      <p className={styles.subtitle}>당신이 궁금해하실 법한 이야기들을 모아봤어요.</p>


      <div className={styles.section}>
        <h2>1. 텔레파시의 철학</h2>
        
        <k>| 우리는 감정이 연결의 시작이라고 믿어요. |</k>
        <p>'텔레파시'는 같은 단어를 떠올린 사람끼리</p>
        <p>익명으로 대화할 수 있는 감정 기반 소셜 플랫폼이에요.</p>
        <p>말하지 않아도, 느낌으로 전해지는 연결을 만들어요.</p>
      </div>


      <div className={styles.section}>
        <h2>2. 주요 기능 안내</h2>
        <h3>| 단어 매칭 |</h3>
            <div className={styles.centered}>
            <img src={Searchbar} alt="검색바" />
            </div>
        <p>같은 단어를 입력한 사람과</p>
        <p>실시간으로 연결되는 기능이에요.</p>
        <h3>| 단어 취소 방법 |</h3>
            <div className={styles.centered}>
            <img src={FrameIcon} alt="사시나무라는 단어를 전송했어요" />
            </div>
        <p>전송된 단어 위에서 꾹 누르면 입력이 취소돼요.</p>


        <h3>| 텔파 |</h3>
            <div className={styles.centered}>
            <img src={Telpa} alt="오늘의기분은어땟나요?" />
            </div>
        <p>연결되기까지의 지루한 기다림 속,</p>
        <p>텔파와 간단히 소통해보세요.</p>


        <h3>| 알림기능 |</h3>
            <div className={styles.centered}>
            <img src={Alert} alt="알림로고" />
            </div>
    

        <h3>| 감정 밸런스 게임 |</h3>
            <div className={styles.centered}>
                <div className={styles.centered_1}>
                <img src={Want_to} alt="위로하고싶어요" /></div>
                <div className={styles.centered_1}>
                <img src={Want_from} alt="위로받고싶어요" />
            </div>
            </div>
        <p>마땅히 떠오르는 단어가 없어 곤란한가요?</p>
        <p>두 가지 선택지 중 하나를 고르면 연결될 수 있어요!</p>


        <h3>| 감정 피드백 |</h3>
            <div className={styles.centered}>
            <img src={Emotion} alt="감정피드백" />
            </div>
        <p>대화 중 들은 감정을 공유해보세요.</p>
        <p>익명으로 전달되는 감정은</p>
        <p>서로에게 따뜻한 여운을 남겨요.</p>
      

        <h3>| 단어 기록 |</h3>
        <div>
            <div className={styles.centered}>
            <img src={Remember} alt="곤약젤리" />
            </div>
        </div>
        <p>우리가 지금, 똑같은 단어를 입력했다는 건</p>
        <p>마치 기적같은 일이에요.</p>
        <p>당신의 빛났던 순간을 텔레파시가 간직해드려요.</p>
        <p>기록된 단어는 <span className={styles.red}>삭제</span>가 어려우니, 이점 꼭 기억해 주세요.</p>
      </div>

      <div className={styles.section}>
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
          Contact : <span className={styles.card}>telepathy.cs@gmail.com</span>
        </p>
        <div className={styles.centered}>
        <k>당신의 낭만적인 연결을, 텔레파시에서 느껴보세요.</k>
        </div>
      </div>
    </div>
    </div>
  );
}

