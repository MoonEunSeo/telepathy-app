import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyCallback() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('인증 결과를 확인 중입니다...');
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const identityVerificationId = searchParams.get('identityVerificationId');

      if (!identityVerificationId) {
        setMessage('❌ 인증 ID가 유효하지 않습니다.');
        return;
      }

      try {
        const res = await fetch('/api/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityVerificationId }),
        });

        const data = await res.json();

        if (data.success) {
          setMessage( `인증성공 ${data.user.name}님 환영합니다.`);
          // 예: navigate('/register/next', { state: data.user });
        } else {
          setMessage(`❌ 인증 실패: ${data.message}`);
        }
      } catch (err) {
        console.error('[인증 결과 오류]', err);
        setMessage('❌ 인증 결과 확인 중 오류가 발생했습니다.');
      }
    };

    run();
  }, [searchParams]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>{message}</h2>
    </div>
  );
}