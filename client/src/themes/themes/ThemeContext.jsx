import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("halloween"); // 기본 테마

  useEffect(() => {
    // body 클래스 초기화 후 현재 테마 적용
    document.body.className = "";
    document.body.classList.add(`${theme}-mode`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
