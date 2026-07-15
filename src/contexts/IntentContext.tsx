import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

// 원본 주석에 있던 3가지 값만 허용 (오타/이상한 값은 컴파일 에러)
type Intent = 'comfort_me' | 'comfort_others' | 'light_connection';

// 이 Context가 실제로 담는 값의 "모양"
interface IntentContextValue {
  intent: Intent | null;
  // useState의 setter를 그대로 넘길 때의 정확한 타입
  setIntent: Dispatch<SetStateAction<Intent | null>>;
}

// ⭐ 마땅한 기본값이 없으니 undefined로 두고, 아래 useIntent에서 방어한다.
const IntentContext = createContext<IntentContextValue | undefined>(undefined);

export const IntentProvider = ({ children }: { children: ReactNode }) => {
  const [intent, setIntent] = useState<Intent | null>(null);

  return <IntentContext.Provider value={{ intent, setIntent }}>{children}</IntentContext.Provider>;
};

// ⭐ 여기서 undefined를 걸러내면, 이 훅을 쓰는 컴포넌트는
//    항상 IntentContextValue(=undefined 아님)를 받는다. → 소비 측이 편해짐
export const useIntent = (): IntentContextValue => {
  const ctx = useContext(IntentContext);
  if (!ctx) {
    throw new Error('useIntent는 <IntentProvider> 안에서만 사용할 수 있어요.');
  }
  return ctx;
};
