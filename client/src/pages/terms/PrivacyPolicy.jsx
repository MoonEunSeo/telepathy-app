import './TermsTemplate.css';

export default function PrivacyPolicy() {
  return (
    <div className="terms-container">
      <h2>🔐 텔레파시 개인정보 처리방침 (필수)</h2>
      <p>
        텔레파시는 이용자의 개인정보 보호를 매우 중요하게 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
      </p>
      <hr />

      <h3>제1조 [수집하는 개인정보 항목]</h3>
      <table className="styled-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>수집 항목</th>
            <th>수집 목적</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>필수</td>
            <td>이메일 주소</td>
            <td>회원 식별, 로그인, 알림 발송</td>
          </tr>
          <tr>
            <td>선택</td>
            <td>닉네임, 프로필 이미지</td>
            <td>마이페이지 개인화</td>
          </tr>
          <tr>
            <td>자동수집</td>
            <td>접속 IP, 쿠키 및 기기정보, 이용기록</td>
            <td>비정상 사용 탐지, 통계 분석</td>
          </tr>
        </tbody>
      </table>

      <hr />
      <h3>제2조 [개인정보 수집 방법]</h3>
      <ul>
        <li>회원가입 시 수집</li>
        <li>서비스 이용 중 자동 수집</li>
        <li>이벤트 참여, 신고 접수 시 수집</li>
      </ul>

      <hr />
      <h3>제3조 [개인정보 이용 목적]</h3>
      <ul>
        <li>회원관리 (본인확인, 중복가입 방지 등)</li>
        <li>원활한 서비스 제공 및 운영</li>
        <li>이상 행위 탐지 및 이용자 보호</li>
        <li>법적 의무 이행 및 분쟁 대응</li>
      </ul>

      <hr />
      <h3>제4조 [개인정보 보유 및 이용 기간]</h3>
      <ul>
        <li><strong>회원 탈퇴 시:</strong> 즉시 파기</li>
        <li>단, 다음의 사유로 최대 <strong>6개월 간 보관</strong>될 수 있습니다.</li>
      </ul>
      <table className="styled-table">
        <thead>
          <tr>
            <th>항목</th>
            <th>보존 사유</th>
            <th>보존 기간</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>이메일 주소, 이용 기록</td>
            <td>불법행위 방지, 수사기관 요청 대응</td>
            <td>탈퇴 후 6개월</td>
          </tr>
        </tbody>
      </table>
      <p>※ 단, 법령에 따라 보존이 필요한 경우 해당 법률 기준에 따릅니다.</p>

      <hr />
      <h3>제5조 [개인정보 파기 절차 및 방법]</h3>
      <ul>
        <li>보유 기간 종료 또는 처리 목적 달성 시 지체 없이 파기</li>
        <li>전자적 파일: 복구 불가능한 기술적 방법으로 삭제</li>
        <li>출력물: 분쇄 또는 소각 처리</li>
      </ul>

      <hr />
      <h3>제6조 [개인정보의 제3자 제공]</h3>
      <ul>
        <li>원칙적으로 외부에 제공하지 않습니다.</li>
        <li>단, 다음의 경우는 예외로 합니다:
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>수사기관 요청 등 법령에 따라 제공이 필요한 경우</li>
          </ul>
        </li>
      </ul>

      <hr />
      <h3>제7조 [이용자의 권리와 행사 방법]</h3>
      <ul>
        <li>본인의 개인정보 열람, 수정, 삭제 요청 가능</li>
        <li>탈퇴 및 개인정보 삭제는 마이페이지에서 가능</li>
        <li>정보주체의 권리행사는 대리인을 통해서도 가능</li>
      </ul>

      <hr />
      <h3>제8조 [개인정보 보호책임자]</h3>
      <ul>
        <li>이름: 문은서</li>
        <li>이메일: <a href="mailto:rlashfod0202@gmail.com">rlashfod0202@gmail.com</a></li>
      </ul>

      <hr />
      <h3>제9조 [기타]</h3>
      <ul>
        <li>본 방침은 법령, 정책 변경에 따라 사전 고지 후 수정될 수 있습니다.</li>
      </ul>
    </div>
  );
}
