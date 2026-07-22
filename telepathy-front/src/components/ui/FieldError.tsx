// 입력창 아래 에러 한 줄 - 너비를 AuthInput에 맞춰 정렬만 유지
export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-[-6px] mb-2 w-[300px] text-[13px] text-[var(--error-text,#e05252)]">
      {message}
    </p>
  );
}
