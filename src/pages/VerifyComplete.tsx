// pages/VerifyComplete.tsx
import { useEffect } from "react";
import type { VerifyConfirmResponse } from "../types";

export default function VerifyComplete() {
  useEffect(() => {
    const { imp_uid } = new URLSearchParams(window.location.search) as unknown as {
      imp_uid?: string;
    };

    if (imp_uid) {
      fetch("/api/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_uid }),
      })
        .then((res) => res.json())
        .then((data: VerifyConfirmResponse) => {
          if (data.success) {
            // 본인인증 성공한 유저 정보 (data.user)로 회원가입 진행
            console.log("🎉 본인인증 성공", data.user);
            // 👉 이후 회원가입 폼으로 이동하거나 Supabase에 등록
          } else {
            console.warn("❌ 인증 실패");
          }
        });
    }
  }, []);

  return null;
}
