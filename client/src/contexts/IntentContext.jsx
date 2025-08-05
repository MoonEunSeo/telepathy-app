// contexts/IntentContext.jsx

//IntentProvider랑 같이 쓰는 애
import { createContext, useContext, useState } from 'react';

const IntentContext = createContext();

export const IntentProvider = ({ children }) => {
  const [intent, setIntent] = useState(null); // 'comfort_me', 'comfort_others', 'light_connection'

  return (
    <IntentContext.Provider value={{ intent, setIntent }}>
      {children}
    </IntentContext.Provider>
  );
};

export const useIntent = () => useContext(IntentContext);
