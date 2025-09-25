import { requestPayment } from "@/utils/requestPayment";

const items = [
  { count: 1, price: 1000 },
  { count: 5, price: 2500 },
  { count: 10, price: 4000 },
];

export default function MegaphoneStore({ userId }) {
  return (
    <div>
      <h2>🔊 확성기 상점</h2>
      {items.map((item) => (
        <button key={item.count} onClick={() => requestPayment({ userId, count: item.count, amount: item.price })}>
          {item.count}개 - {item.price.toLocaleString()}원
        </button>
      ))}
    </div>
  );
}
