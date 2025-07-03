// src/pages/Verify.jsx
/*

import * as PortOne from "@portone/browser-sdk/v2";
import { useEffect } from "react";

export default function Verify() {
  useEffect(() => {
    const id = `idv_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // ✅ 하이픈 없이 고유값 생성

    PortOne.requestIdentityVerification({
      storeId: "store-28f76078-58f0-4b81-ba04-94e49ca9d3d2",
      identityVerificationId: id, // ✅ 하이픈 없이 고유값으로
      channelKey: "channel-key-ea252c8d-2eab-46a2-9d7d-189ce289bab9", // 정확한 채널키로!
      redirectUrl: "http://localhost:5179/verify/callback",
    })
      .then((rsp) => {
        console.log("✅ 인증 성공:", rsp);
      })
      .catch((err) => {
        console.error("❌ 인증 실패:", err);
        alert("본인인증에 실패했습니다.");
      });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>본인인증을 진행 중입니다...</h2>
    </div>
  );
}
  */

import { useEffect } from 'react';
//import * as PortOne from '@portone/browser-sdk/v2';

export default function Verify() {
  useEffect(() => {
    const run = async () => {
      try {
        // 1. 백엔드에서 ID 발급 요청
        const res = await fetch('/api/verify/prepare', {
          method: 'POST',
        });
        const { identityVerificationId } = await res.json();

        // 2. 본인인증 요청
        const response = await PortOne.requestIdentityVerification({
          storeId: 'store-28f76078-58f0-4b81-ba04-94e49ca9d3d2', // 실제 테스트 상점코드 입력
          identityVerificationId,
          channelKey: 'channel-key-ea252c8d-2eab-46a2-9d7d-189ce289bab9', // 테스트 채널키
          redirectUrl: '/verify/callback',
        });

        if (response.code) {
          alert(response.message);
          return;
        }

        console.log('✅ 인증 성공:', response);
      } catch (err) {
        console.error('❌ 본인인증 실패', err);
        alert('본인인증 중 오류가 발생했습니다.');
      }
    };

    run();
  }, []);

  return <h2 style={{ textAlign: 'center' }}>본인인증을 진행 중입니다...</h2>;
}
