import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ThemeContextValue {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState('halloween'); // 기본 테마

  useEffect(() => {
    // body 클래스 초기화 후 현재 테마 적용
    document.body.className = '';
    document.body.classList.add(`${theme}-mode`);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme은 <ThemeProvider> 안에서만 사용할 수 있어요.');
  }
  return ctx;
};
