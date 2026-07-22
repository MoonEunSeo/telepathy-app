type State = 'error' | 'success';

interface FieldMessageProps {
  message?: string;
  state?: State;
}

const STATE: Record<State, string> = {
  error: 'text-[var(--color-danger)]',
  success: 'text-[var(--color-link)]',
};

// 입력창 아래 에러 한 줄 - 너비를 AuthInput에 맞춰 정렬만 유지
export default function FieldMessage({ message, state = 'error' }: FieldMessageProps) {
  if (!message) return null;
  return <p className={`mt-[-6px] mb-2 w-[300px] text-[13px] ${STATE[state]}`}>{message}</p>;
}
