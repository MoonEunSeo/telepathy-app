// src/contexts/WordSessionContext.js
/*import React, { createContext, useState, useContext } from 'react';

const WordSessionContext = createContext();

export const WordSessionProvider = ({ children }) => {
  const [word, setWord] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [matchFound, setMatchFound] = useState(false);

  const startSession = (inputWord) => {
    setWord(inputWord);
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    setMatchFound(false);
  };

  const endSession = () => {
    setWord('');
    setIsSessionActive(false);
    setSessionStartTime(null);
    setMatchFound(false);
  };

  return (
    <WordSessionContext.Provider
      value={{
        word,
        isSessionActive,
        sessionStartTime,
        matchFound,
        selectedWord: word,
        setCurrentWord: setWord,
        setWord,
        startSession,
        endSession,
        setMatchFound
      }}
    >
      {children}
    </WordSessionContext.Provider>
  );
};

export const useWordSession = () => useContext(WordSessionContext);*/

// WordSessionContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const WordSessionContext = createContext();

export const WordSessionProvider = ({ children }) => {
  const [word, setWord] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [startTime, setStartTime] = useState(null); // ✅ 추가됨

  const startSession = (newWord) => {
    setWord(newWord);
    setIsSessionActive(true);
    setStartTime(Date.now());
    console.log('🌟 startSession 내부:', newWord, Date.now());
  };

  const endSession = () => {
    setWord(null);
    setIsSessionActive(false);
    setStartTime(null); // ✅ 초기화
  };

  return (
    <WordSessionContext.Provider
      value={{ word, isSessionActive, startSession, endSession, startTime }}
    >
      {children}
    </WordSessionContext.Provider>
  );
};

export const useWordSession = () => useContext(WordSessionContext);