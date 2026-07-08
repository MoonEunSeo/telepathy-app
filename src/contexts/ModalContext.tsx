import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
// 참고: 원본의 `import React` 는 삭제했다.
//  - react-jsx 변환이라 React를 직접 import 할 필요가 없고
//  - noUnusedLocals 규칙 때문에 안 쓰는 import가 있으면 오히려 에러다.

interface ModalContextValue {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  // useState(false) 는 TS가 알아서 boolean으로 추론 → 제네릭 생략 OK
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal은 <ModalProvider> 안에서만 사용할 수 있어요.');
  }
  return ctx;
};
