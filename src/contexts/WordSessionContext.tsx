import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Id, MatchSession } from '../types';

// setProfile 입력: 프로필을 "저장하는" 시점이라 값이 확실히 있음 → non-null
interface ProfileInput {
  userId: Id;
  username: string;
  nickname: string;
}

// startSession 입력: 세션 시작 시 넘어오는 값들 → non-null
interface StartSessionInput {
  word: string;
  round: number;
  roomId: Id;
  myId: Id;
  myUsername: string;
  myNickname: string;
  partnerId: Id;
  partnerUsername: string;
  partnerNickname: string;
}

// Context가 담는 전체 값 = 세션 상태(MatchSession) 전부 + 함수 3개.
// 인터섹션(&)으로 MatchSession을 통째로 재사용한다.
type WordSessionContextValue = MatchSession & {
  setProfile: (input: ProfileInput) => void;
  startSession: (input: StartSessionInput) => void;
  endSession: () => void;
};

const WordSessionContext = createContext<WordSessionContextValue | undefined>(undefined);

const INITIAL_SESSION: MatchSession = {
  myId: null,
  myUsername: null,
  myNickname: null,
  word: null,
  round: null,
  roomId: null,
  partnerId: null,
  partnerUsername: null,
  partnerNickname: null,
  isActive: false,
  startTime: null,
};

export const WordSessionProvider = ({ children }: { children: ReactNode }) => {
  // ⚠️ 제네릭 명시 필수: 안 하면 모든 필드가 null 타입으로 굳어버림
  const [session, setSession] = useState<MatchSession>(INITIAL_SESSION);

  const setProfile = ({ userId, username, nickname }: ProfileInput) => {
    setSession((prev) => ({
      ...prev,
      myId: userId,
      myUsername: username,
      myNickname: nickname,
    }));
  };

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
  }: StartSessionInput) => {
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
  };

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
  };

  return (
    <WordSessionContext.Provider
      value={{ ...session, setProfile, startSession, endSession }}
    >
      {children}
    </WordSessionContext.Provider>
  );
};

export const useWordSession = (): WordSessionContextValue => {
  const ctx = useContext(WordSessionContext);
  if (!ctx) {
    throw new Error('useWordSession은 <WordSessionProvider> 안에서만 사용할 수 있어요.');
  }
  return ctx;
};
