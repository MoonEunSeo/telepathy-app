import './TermsTemplate.css';

export default function NotificationConsent() {
  return (
    <div className="terms-container">

      <h2>✅ 선택: 알림 수신 동의 (웹푸시 등)</h2>
      <p>
        <strong>텔레파시는 사용자에게 의미 있는 소식을 전달하기 위해 알림 기능을 운영합니다.</strong>
        <br />
        이 동의를 통해 <strong>웹푸시</strong> 수신 여부를 선택하실 수 있습니다.
      </p>
      <hr />

      <h3>제1조 [알림 내용]</h3>
      <ul>
        <li>감정 피드백 도착 안내</li>
        <li>매칭 성공 / 종료 알림</li>
        <li>신규 기능 업데이트 및 이벤트</li>
      </ul>
      <hr />

      <h3>제2조 [알림 수신 매체]</h3>
      <ul>
        <li>웹푸시 알림 (브라우저 기반)</li>
        <li>이메일 (계정에 등록된 이메일 주소 기준)</li>
      </ul>
      <hr />

      <h3>제3조 [동의 거부 시 불이익]</h3>
      <ul>
        <li>본 동의는 <strong>선택사항</strong>이며, 동의하지 않아도 서비스 이용에 제한은 없습니다.</li>
        <li>다만 일부 실시간 알림 기능은 제공되지 않습니다.</li>
      </ul>
    </div>
  );
}