import PortOne from "@portone/browser-sdk/v2";

export async function requestPayment({ userId, count, amount }) {
  try {
    const response = await PortOne.requestPayment({
      storeId: process.env.REACT_APP_PORTONE_STORE_ID,
      channelKey: process.env.REACT_APP_PORTONE_CHANNEL_KEY,
      paymentId: `megaphone_${userId}_${Date.now()}`,
      orderName: `확성기 ${count}개`,
      totalAmount: amount,
      currency: "KRW",
      customer: { customerId: `${userId}` },
    });

    if (response.code === "SUCCESS") {
      await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imp_uid: response.paymentId,
          userId,
          count,
          amount,
        }),
      });
      alert("확성기 구매 성공!");
    } else {
      alert("결제 실패: " + response.message);
    }
  } catch (err) {
    console.error(err);
    alert("결제 오류 발생");
  }
}
