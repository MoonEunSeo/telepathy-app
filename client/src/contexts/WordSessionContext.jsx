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
/*
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

export const useWordSession = () => useContext(WordSessionContext);*/

// src/contexts/WordSessionContext.jsx
// WordSessionContext.jsx
// /contexts/WordSessionContext.jsx
import { createContext, useContext, useState } from 'react';

const WordSessionContext = createContext();

export const WordSessionProvider = ({ children }) => {
  const [session, setSession] = useState({
    // 🟢 내 프로필
    myId: null,
    myUsername: null,
    myNickname: null,

    // 🟢 매칭 정보
    word: null,
    round: null,
    roomId: null,
    partnerId: null,
    partnerUsername: null,
    partnerNickname: null,

    // 상태 관리
    isActive: false,
    startTime: null,
  });

  // ✅ 내 프로필 저장
  const setProfile = ({ userId, username, nickname }) => {
    setSession((prev) => ({
      ...prev,
      myId: userId,
      myUsername: username,
      myNickname: nickname,
    }));
    console.log("🙋 프로필 저장:", { userId, username, nickname });
  };

  // ✅ 세션 시작
  const startSession = ({
    word,
    round,
    roomId,
    myId,
    myUsername,
    myNickname,
    partnerId,
    partnerUsername,
    partnerNickname,
  }) => {
    setSession({
      word,
      round,
      roomId,
      myId,
      myUsername,
      myNickname,
      partnerId,
      partnerUsername,
      partnerNickname,
      isActive: true,
      startTime: Date.now(),
    });

    console.log("🌟 startSession:", {
      word,
      round,
      roomId,
      myId,
      myUsername,
      myNickname,
      partnerId,
      partnerUsername,
      partnerNickname,
    });
  };

  // ✅ 세션 종료
  const endSession = () => {
    setSession((prev) => ({
      ...prev,
      word: null,
      round: null,
      roomId: null,
      partnerId: null,
      partnerUsername: null,
      partnerNickname: null,
      isActive: false,
      startTime: null,
    }));
    console.log("🛑 세션 종료");
  };

  return (
    <WordSessionContext.Provider
      value={{
        ...session,
        setProfile,
        startSession,
        endSession,
      }}
    >
      {children}
    </WordSessionContext.Provider>
  );
};

export const useWordSession = () => useContext(WordSessionContext);
