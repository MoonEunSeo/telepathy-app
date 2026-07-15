import PortOne from '@portone/browser-sdk/v2';

import type { Id } from '../types';
import type { PaymentsVerifyRequest } from '../types';

interface RequestPaymentArgs {
  userId: Id;
  count: number;
  amount: number;
}

export async function requestPayment({ userId, count, amount }: RequestPaymentArgs): Promise<void> {
  try {
    const response = (await PortOne.requestPayment({
      storeId: import.meta.env.VITE_PORTONE_STORE_ID,
      channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
      payMethod: 'CARD', // TODO: 결제수단 확인
      paymentId: `megaphone_${userId}_${Date.now()}`,
      orderName: `확성기 ${count}개`,
      totalAmount: amount,
      currency: 'KRW',
      customer: { customerId: `${userId}` },
    }))!;

    if (response.code === 'SUCCESS') {
      const body: PaymentsVerifyRequest = {
        imp_uid: response.paymentId!, // TODO: 타입 확인 — PortOne SUCCESS 응답의 paymentId 존재 보장
        userId,
        count,
        amount,
      };
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      alert('확성기 구매 성공!');
    } else {
      alert('결제 실패: ' + response.message);
    }
  } catch (err) {
    console.error(err);
    alert('결제 오류 발생');
  }
}
