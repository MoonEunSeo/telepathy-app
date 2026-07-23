import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Pencil, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useWordHistory, wordHistoryKey } from '../hooks/useWordHistory';
import type { WordHistoryItem, WordHistoryResponse, WordHistoryUpdateRequest } from '../types';

const ORB_CLASSES = [
  'bg-[linear-gradient(140deg,#f0c58f,#de87b2)]', // warm
  'bg-[linear-gradient(140deg,#9fc9ef,#de87b2)]', // blue
  'bg-[linear-gradient(140deg,#f4b1a7,#de87b2)]', // pink
];

function orbClass(name: string | null | undefined) {
  const s = name ?? '';
  let sum = 0;
  for (let i = 0; i < s.length; i += 1) sum += s.charCodeAt(i);
  return ORB_CLASSES[sum % ORB_CLASSES.length];
}

// 카드 컴포넌트
interface WordCardProps {
  item: WordHistoryItem;
  onToggleFavorite: () => void;
  onSaveMemo: (next: string) => void;
}

function WordCard({ item, onToggleFavorite, onSaveMemo }: WordCardProps) {
  const [editing, setEditing] = useState(false);
  const memo = item.memo;
  const [draft, setDraft] = useState(memo ?? '');

  // 부모기 들고 있는 memo가 바뀌면 편집용 draft도 맞춘다
  useEffect(() => setDraft(memo ?? ''), [memo]);

  const save = () => {
    onSaveMemo(draft.trim()); // 부모가 올려 저장(-> localStorage)
    setEditing(false);
  };

  const partnerName = item.partner_nickname?.trim() || '익명';
  const dateText = new Date(item.connected_at).toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    /* 구 .word-card — 페이퍼 카드 + 마스킹테이프(::before) */
    <article className="relative min-h-[146px] rounded-[18px_18px_18px_6px] border border-[#e8d8c5] bg-[linear-gradient(135deg,#ffffff,#fff9f0)] px-4 pt-[18px] pb-3.5 [box-shadow:0_14px_28px_rgba(62,45,31,0.08)] before:absolute before:top-[-7px] before:left-[17px] before:h-[14px] before:w-[52px] before:-rotate-2 before:rounded-[3px] before:bg-[rgba(224,199,172,0.46)] before:content-['']">
      {/* 즐겨찾기 하트 */}
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={item.is_favorite}
        aria-label={item.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        title={item.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        className={`absolute top-2.5 right-[11px] grid h-9 w-9 place-items-center rounded-full transition-colors ${
          item.is_favorite ? 'bg-[#f9e9eb] text-[#b9777b]' : 'text-[#4b3a30] hover:bg-[#f1e4d6]'
        }`}
      >
        <Heart size={18} fill={item.is_favorite ? 'currentColor' : 'none'} />
      </button>

      {/* 단어 + 사람 / 날짜 */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="m-0 mb-3 text-[18px] leading-tight font-black text-[#2b211b]">
            {item.word}
          </h2>
          <div className="flex min-w-0 items-center gap-2.5 text-[12px] text-[#6288c8]">
            <span
              className={`h-6 w-6 shrink-0 rounded-full ${orbClass(partnerName)} [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.42)]`}
            />
            <span className="truncate">{partnerName} 님</span>
          </div>
        </div>
        <time
          dateTime={item.connected_at}
          className="self-end text-[10px] whitespace-nowrap text-[#b7a596]"
        >
          {dateText}
        </time>
      </div>

      {/* 메모 (보기 ↔ 편집) */}
      <div className="mt-5 grid min-h-[34px] grid-cols-[1fr_auto] items-center gap-2 rounded-[13px] border border-[#eedfce] bg-[#fbf3e9] py-2 pr-2 pl-[11px] text-[12px] leading-snug text-[#7d6859]">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={34}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
            className="w-full border-0 bg-transparent p-0 text-[12px] text-[#5d493b] outline-none"
          />
        ) : (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {item.memo || '아직 남긴 메모가 없어요.'}
          </span>
        )}
        <button
          type="button"
          onClick={() => (editing ? save() : setEditing(true))}
          aria-label={editing ? '메모 저장' : '메모 수정'}
          title={editing ? '메모 저장' : '메모 수정'}
          className="grid h-[26px] w-[26px] place-items-center rounded-full text-[#9b8775]"
        >
          {editing ? <Check size={16} /> : <Pencil size={16} />}
        </button>
      </div>
    </article>
  );
}

export default function MyWords() {
  // 초기값을 localStorage에서 즉시 읽어온다 (lazy initializer)
  // S1: 목록은 공용 캐시(useWordHistory)에서 받는다 — MyPage 와 요청 공유
  const queryClient = useQueryClient();
  const { data: wordHistory = [] } = useWordHistory();

  // 낙관적 업데이트: 로컬 state 대신 쿼리 캐시를 직접 갱신 → 재방문 시에도 편집 유지
  const updateHistory = (updater: (prev: WordHistoryItem[]) => WordHistoryItem[]) =>
    queryClient.setQueryData<WordHistoryResponse>(wordHistoryKey, (old) => ({
      history: updater(old?.history ?? []),
    }));

  // 공통: 서버에 PATCH, 실패하면 rollbak 실행
  const patchItem = async (id: string, patch: WordHistoryUpdateRequest, rollback: () => void) => {
    try {
      const res = await fetch(`/api/word-history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('수정 실패');
    } catch (err) {
      console.error('❌ 저장 실패:', (err as Error).message);
      toast.error('저장에 실패했어요.');
      rollback(); // 화면 되돌리기
    }
  };

  // 즐겨찾기: 화면 먼저 바꾸고(낙관적) → 서버 저장 → 실패 시 원복
  const toggleFavorite = (item: WordHistoryItem) => {
    const next = !item.is_favorite;
    updateHistory((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_favorite: next } : it)),
    );
    patchItem(item.id, { isFavorite: next }, () =>
      updateHistory((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_favorite: !next } : it)),
      ),
    );
  };

  // 메모: 동일 패턴
  const saveMemo = (item: WordHistoryItem, memo: string) => {
    const prevMemo = item.memo;
    updateHistory((prev) => prev.map((it) => (it.id === item.id ? { ...it, memo } : it)));
    patchItem(item.id, { memo }, () =>
      updateHistory((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, memo: prevMemo } : it)),
      ),
    );
  };

  // 즐겨찾기한 카드를 위로 (안정 정렬)
  const sorted = [...wordHistory].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));

  return (
    /* 구 .my-words-container */
    <div className="min-h-screen bg-[var(--color-bg)] px-[18px] pt-[18px] pb-24">
      <header className="mb-4">
        <h1 className="m-0 text-[18px] leading-tight font-bold text-[#2b211b]">
          누군가와 함께 떠올린 단어
        </h1>
        <p className="mt-1 mb-0 text-[11px] leading-relaxed text-[#8d7666]">
          그날의 마음이 아직 접힌 종이처럼 남아 있어요.
        </p>
      </header>

      {sorted.length > 0 ? (
        <div className="grid gap-[13px]">
          {sorted.map((item) => (
            <WordCard
              key={item.id}
              item={item}
              onToggleFavorite={() => toggleFavorite(item)}
              onSaveMemo={(text) => saveMemo(item, text)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-[0.85rem] text-[var(--color-text-faint)]">
          아직 함께 떠올린 단어가 없어요.
        </p>
      )}
    </div>
  );
}
