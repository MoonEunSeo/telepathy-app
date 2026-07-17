import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { VerifyConfirmResponse } from '../types';
import Button from '../components/ui/Button';

export default function VerifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('인증 결과를 확인 중입니다...');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const run = async () => {
      const identityVerificationId = searchParams.get('identityVerificationId');

      if (!identityVerificationId) {
        setStatus('error');
        setMessage('인증 ID가 유효하지 않습니다.');
        return;
      }

      try {
        const res = await fetch('/api/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityVerificationId }),
        });

        const data = (await res.json()) as VerifyConfirmResponse;

        if (data.success) {
          setStatus('success');
          setUserName(data.user?.name ?? '');
        } else {
          setStatus('error');
          setMessage(`인증 실패: ${data.message}`);
        }
      } catch (err) {
        console.error('[인증 결과 오류]', err);
        setStatus('error');
        setMessage('인증 결과 확인 중 오류가 발생했습니다.');
      }
    };

    run();
  }, [searchParams]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      {status === 'success' ? (
        <>
          {/* 중앙 체크 아이콘 (검정 원) */}
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--color-accent)] [box-shadow:var(--card-shadow)] min-[1025px]:h-24 min-[1025px]:w-24">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-on-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 [font-family:'Judson',serif] text-[32px] font-bold text-[var(--color-text-strong)] min-[1025px]:text-[38px]">
            인증 성공
          </h1>
          <p className="mt-3 text-[15px] text-[var(--auth-lead-color)]">
            {userName && <b className="font-bold text-[var(--main-title-color)]">{userName}님</b>}{' '}
            환영합니다
          </p>
          <div className="mt-8">
            <Button onClick={() => navigate('/main')}>시작하기</Button>
          </div>
        </>
      ) : (
        <p className="[font-family:'Gowun_Dodum'] text-[16px] text-[var(--color-text)]">
          {message}
        </p>
      )}
    </div>
  );
}
