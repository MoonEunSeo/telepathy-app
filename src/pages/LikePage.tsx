import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import tossQr from "../assets/toss_qr.jpg";
import styles from "../themes/pages/LikePage.module.css";

import type {
  CurrentUser,
  Wordset,
  ProfileResponse,
  WordsetsMineResponse,
  UserByIdResponse,
  SpPaymentStatusResponse,
} from "../types";

type PaymentStatus = "idle" | "pending" | "checking" | "paid" | "expired";

const LikesPage = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("idle"); // idle → pending → checking → paid → expired
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [realName, setRealName] = useState("");
  const amount = 1000;

  // ✅ [1] 사용자 정보 불러오기
  const [myWordSets, setMyWordSets] = useState<Wordset[]>([]); // ✅ 안전한 초기값 설정

  useEffect(() => {
    const fetchProfileAndWordsets = async () => {
      try {
        const res = await fetch("/api/nickname/profile", { credentials: "include" });
        const data = (await res.json()) as ProfileResponse;

        if (data.success && (data.id || data.userId)) {
          const user: CurrentUser = {
            id: data.id || data.userId!,
            nickname: data.nickname,
            username: data.username,
          };
          setCurrentUser(user);

          // ✅ 프로필이 성공적으로 불러와졌다면 즉시 단어세트 조회 실행
          try {
            const wordRes = await axios.get<WordsetsMineResponse>(`/api/wordsets/mine/${user.id}`, { withCredentials: true });
            if (wordRes.data.success && Array.isArray(wordRes.data.wordsets)) {
              setMyWordSets(wordRes.data.wordsets);
            }
          } catch (err) {
            console.error("❌ 단어세트 조회 실패:", err);
          }
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndWordsets();
  }, []);

    // ✅ [2] 내 단어세트 불러오기
    useEffect(() => {
      if (!currentUser) return;

      const fetchWordSets = async () => {
        try {
          const res = await axios.get<WordsetsMineResponse>(`/api/wordsets/mine/${currentUser.id}`, { withCredentials: true });
          if (res.data.success && Array.isArray(res.data.wordsets)) {
            setMyWordSets(res.data.wordsets);
          }
        } catch (err) {
          console.error("❌ 단어세트 조회 실패:", err);
        }
      };

      fetchWordSets();
    }, [currentUser]);

  // ✅ [3] 입금하기 버튼 클릭 → 실명 확인 & 모달 표시
  const handleDepositClick = async () => {
    if (!currentUser) return;

    try {
      // 🔍 user 테이블에서 실명 조회
      const res = await axios.get<UserByIdResponse>(`/api/user/${currentUser.id}`, { withCredentials: true });
      const savedName = res.data?.real_name;

      if (savedName) {
        console.log("✅ 실명 이미 등록됨:", savedName);
        setRealName(savedName);
        handleStartPayment(savedName); // 바로 결제 프로세스 실행
      } else {
        console.log("⚠️ 실명 없음 → 입력 필요");
        setShowNameModal(true); // 실명 입력 모달 오픈
      }
    } catch (err) {
      console.error("❌ 실명 조회 실패:", err);
      alert("서버에서 사용자 정보를 불러오지 못했습니다. 다시 시도해주세요.");
    }
  };

  // ✅ [4] 실명 입력 모달 → 저장 후 결제 시작
  const handleSaveNameAndStart = async () => {
    if (!realName.trim()) return alert("실명을 입력해주세요!");

    try {
      await axios.post(
        `/api/user/update-realname`,
        { user_id: currentUser!.id, real_name: realName },
        { withCredentials: true }
      );
      console.log("✅ 실명 저장 완료:", realName);
      setShowNameModal(false);
      handleStartPayment(realName);
    } catch (err) {
      console.error("❌ 실명 저장 실패:", err);
    }
  };

  //✅ [5] 결제 생성 (공통 로직)
  const handleStartPayment = async (finalName: string) => {
    try {
      await axios.post(
        `/api/sp_payments/create`,
        {
          user_id: currentUser!.id,
          name: finalName,
          amount,
        },
        { withCredentials: true }
      );

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setStatus("pending");

      if (isMobile) {
        const mobileTossLink = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(
          "케이뱅크"
        )}&accountNo=100121028199&origin=qr`;
        window.location.href = mobileTossLink;
        setTimeout(() => setStatus("checking"), 2000);
      }
    } catch (err) {
      console.error("❌ 결제 생성 오류:", err);
    }
  };

  // ✅ [6] PC에서 입금확인 버튼 클릭
  const handleCheckDeposit = () => {
    setStatus("checking");
    setTimer(60);
  };

  // ✅ [7] 60초 동안 결제 상태 주기적 확인
  useEffect(() => {
    if (status !== "checking" || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get<SpPaymentStatusResponse>(`/api/sp_payments/status/${currentUser.id}`, {
          withCredentials: true,
        });

        if (res.data.status === "paid") {
          clearInterval(interval);
          setStatus("paid");
          setShowSuccessModal(true);
        }
      } catch (err) {
        console.error("❌ 상태 확인 실패:", err);
      }

      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    // 타이머 만료 처리
    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === "paid" ? prev : "expired"));
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, currentUser]);

  // ✅ [9] 기본 로딩 / 로그인 체크
  if (loading) return <h3 style={{ textAlign: "center" }}>로딩 중입니다 ⏳</h3>;
  if (!currentUser)
    return (
      <div className={styles['like-container']}>
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login" className={styles['like-button']}>로그인하러 가기</a>
      </div>
    );

  // ======================= 렌더링 =======================

  //💬 [1] 초기 상태
  if (status === "idle") {
    return (
      <div className={styles['like-container']}>
        <h1 className={styles['like-title']}>Telepathy</h1>
<p className={styles['like-description']}>
  텔레파시에 등장하는 단어들을 직접 만들어보세요!<br />
  당신이 원하는 단어로 연결되는 짜릿함을 느껴보세요💫
</p>
<button onClick={handleDepositClick} className={styles['like-button']}>
  단어세트 직접 만들기 🐈‍⬛
</button>

<p className={styles['like-info']}>
  1,000원에 4개 단어 1세트를 추가 할 수 있습니다.<br /><br />
  부적절한 단어(종교,정치,19,욕설 등)는 검토 후 반영이 <br />
  거부 될 수 있으며 결제 금액은 입력하신 계좌로 환불됩니다.<br /><br />
  텔레파시 반영까지는 최대 24시간이 소요됩니다.
</p>

<p className={styles['like-warning']}>
  ⚠️ 입금자명(실명)과 결제 정보가 일치하지 않으면<br />
  결제가 승인되지 않으며 환불 대상에서도 제외됩니다.
</p>

<p className={styles['like-info']}>
결제 오류가 발생했나요? 마이페이지 → 결제문의에서 알려주세요!🙏
</p>

        {/* ✅ 실명 입력 모달 */}
        {showNameModal && (
          <div className={styles['modal-overlay']}>
            <div className={styles['modal-box']}>
              <h3>입금자명(실명)을 입력해주세요 🙏</h3>
              <input
                type="text"
                value={realName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRealName(e.target.value)}
                placeholder="예: 홍길동"
                className={styles['modal-input']}
              />
              <div style={{ marginTop: "15px" }}>
                <button onClick={handleSaveNameAndStart} className={styles['modal-button']}>
                  확인
                </button>
                <button onClick={() => setShowNameModal(false)} className={styles['modal-cancel']}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

         {/* ✅ 내가만든 단어세트구역 */}
        {myWordSets.length > 0 && (
          <div className={styles['wordset-section']}>
            <h4 className={styles['wordset-title']}>내가 신청한 단어세트</h4>
            <div className={styles['wordset-list']}>
              {myWordSets.map((set, i) => (
                <div key={i} className={styles['wordset-item']}>
                  <button className={styles['wordset-button']}>
                    {set.words?.join(", ") || "단어 없음"}
                  </button>
                  <span className={styles['wordset-status']}>- 처리중</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

// 💬 [2] 입금 안내
if (status === "pending") {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile)
    return (
      <div
        className={styles['like-container']}
        style={{ justifyContent: "center", minHeight: "100vh" }}
      >
        <h3 className={styles['deposit-title']}>토스 앱으로 이동 중입니다... 📱</h3>
        <p className={styles['deposit-text']}>
          입금 후 이 페이지로 돌아오시면 자동으로 확인이 시작돼요.
        </p>
      </div>
    );

  return (
    <div className={styles['like-container']}>
      <h3 className={styles['deposit-title']}>입금 안내</h3>
      <p className={styles['deposit-text']}>📱 휴대폰 토스 앱으로 아래 QR을 스캔해주세요.</p>
      {/* <p className={styles['deposit-warning']}>⚠️ 테스트 중 기능이에요. 실제 입금하지 마세요!</p>*/}
      <p className={styles['deposit-warning']}>⚠️아래 입금 확인하기 버튼을 누르신 후 60초 안에 결제를 완료해주세요.</p>
      <div className={styles['qr-card']}>
        <img src={tossQr} alt="Toss QR" />
      </div>

      <p className={styles['deposit-account']}>케이뱅크 100-121-028199 (문*서)</p>

      <button
        onClick={handleCheckDeposit}
        className={styles['deposit-button']}
      >
        입금 확인하기 ⏱
      </button>

            <p className={styles['like-info']}>
      결제 오류가 발생했나요? 마이페이지 → 결제문의에서 알려주세요!🙏
      </p>
    </div>
  );
}

// 💬 [3] 입금 확인 중
if (status === "checking" && timer > 0) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className={styles['deposit-container']}>
      {/* ✅ PC일 때만 QR 표시 */}
      {!isMobile && (
        <div className={styles['qr-card']}>
          <img src={tossQr} alt="Toss QR" />
        </div>
      )}

      <h3 className={styles['deposit-title']}>입금 확인 중입니다 ⏳</h3>
      <p className={styles['deposit-text']}>{timer}초 남았습니다</p>
    </div>
  );
}

// 💬 [4] 입금 완료
if (status === "paid") {
  return (
    <>
      {showSuccessModal && (
        <div className={styles['modal-overlay']}>
          <div className={styles['qr-card']}>
            <h3 className={styles['deposit-title']}>입금이 확인되었어요! 🎉</h3>
            <p className={styles['deposit-text']}>
              나만의 단어 세트를<br />만들어볼까요?
            </p>
            <button
              onClick={() => (window.location.href = "/wordset")}
              className={styles['deposit-button']}
            >
              만들러 가기 ✨
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 💬 [5] 만료
if (status === "expired") {
  return (
    <div className={styles['deposit-container']}>
      <h3 className={styles['deposit-title']}>입금 시간이 만료되었어요 😢</h3>
      <button
        onClick={() => setStatus("idle")}
        className={styles['deposit-button']}
      >
        다시 시도하기
      </button>
    </div>
  );
}

};


export default LikesPage;
