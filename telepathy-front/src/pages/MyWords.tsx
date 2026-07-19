import { useEffect, useState } from 'react';
import { Heart, Pencil, Check } from 'lucide-react';
import { getStorage, setStorage } from '../types';
import type { WordHistoryItem, WordHistoryResponse } from '../types';

// 카드 식별 키 (상대닉네임 | 단어 | 연결일시)
const itemKey = (item: WordHistoryItem) =>
  `${item.partner_nickname} | ${item.word} | ${item.connected_at}`;

const ORB_CLASSES = [
  'bg-[linear-gradient(140deg,#f0c58f,#de87b2)]', // warm
  'bg-[linear-gradient(140deg,#9fc9ef,#de87b2)]', // blue
  'bg-[linear-gradient(140deg,#f4b1a7,#de87b2)]', // pink
];

function orbClass(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return ORB_CLASSES[sum % ORB_CLASSES.length];
}

// 카드 컴포넌트
interface WordCardProps {
  item: WordHistoryItem;
  favorite: boolean;
  memo: string;
  onToggleFavorite: () => void;
  onSaveMemo: (next: string) => void;
}

function WordCard({ item, favorite, memo, onToggleFavorite, onSaveMemo }: WordCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo); // 편집 중 입력값(임시)

  // 부모기 들고 있는 memo가 바뀌면 편집용 draft도 맞춘다
  useEffect(() => setDraft(memo), [memo]);

  const save = () => {
    onSaveMemo(draft.trim()); // 부모가 올려 저장(-> localStorage)
    setEditing(false);
  };

  const dateText = new Date(item.connected_at).toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    /* 구 .word-card — 페이퍼 카드 + 좌하단만 각진 모서리 + 마스킹테이프(::before) */
    <article className="relative min-h-[146px] rounded-[18px_18px_18px_6px] border border-[#e8d8c5] bg-[linear-gradient(135deg,#ffffff,#fff9f0)] px-4 pt-[18px] pb-3.5 [box-shadow:0_14px_28px_rgba(62,45,31,0.08)] before:absolute before:top-[-7px] before:left-[17px] before:h-[14px] before:w-[52px] before:-rotate-2 before:rounded-[3px] before:bg-[rgba(224,199,172,0.46)] before:content-['']">
      {/* 구 .favorite-trigger — 즐겨찾기 하트(우상단) */}
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        className={`absolute top-2.5 right-[11px] grid h-9 w-9 place-items-center rounded-full transition-colors ${
          favorite ? 'bg-[#f9e9eb] text-[#b9777b]' : 'text-[#4b3a30] hover:bg-[#f1e4d6]'
        }`}
      >
        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
      </button>

      {/* 구 .word-main — (단어 + 사람) / 날짜 */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="m-0 mb-3 text-[18px] leading-tight font-black text-[#2b211b]">
            {item.word}
          </h2>
          {/* 구 .person */}
          <div className="flex min-w-0 items-center gap-2.5 text-[12px] text-[#6288c8]">
            <span
              className={`h-6 w-6 shrink-0 rounded-full ${orbClass(item.partner_nickname)} [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.42)]`}
            />
            <span className="truncate">{item.partner_nickname} 님</span>
          </div>
        </div>
        <time
          dateTime={item.connected_at}
          className="self-end text-[10px] whitespace-nowrap text-[#b7a596]"
        >
          {dateText}
        </time>
      </div>

      {/* 구 .memo — 메모 (보기 ↔ 편집 토글) */}
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
            {memo || '아직 남긴 메모가 없어요.'}
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

// 🚧 임시: 디자인 미리보기용 목업 (확인 후 삭제)
const MOCK: WordHistoryItem[] = [];

export default function MyWords() {
  const [wordHistory, setWordHistory] = useState<WordHistoryItem[]>([]);
  // 초기값을 localStorage에서 즉시 읽어온다 (lazy initializer)
  const [favorites, setFavorites] = useState<string[]>(() => getStorage('wordFavorites') ?? []);
  const [memos, setMemos] = useState<Record<string, string>>(() => getStorage('wordMemos') ?? {});

  // 단어 기록 불러오기
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/word-history', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('서버 응답 실패');
        }

        const data = (await res.json()) as WordHistoryResponse;

        // setWordHistory(Array.isArray(data.history) ? data.history : MOCK);
        setWordHistory(data.history.length ? data.history : MOCK);
      } catch (err) {
        console.error('❌ 단어 기록 불러오기 실패:', (err as Error).message);
        setWordHistory([]);
      }
    };

    fetchHistory();
  }, []);

  // 즐겨찾기/메모가 바뀔 때마다 localStorage에 저장
  useEffect(() => setStorage('wordFavorites', favorites), [favorites]);
  useEffect(() => setStorage('wordMemos', memos), [memos]);

  const toggleFavorite = (key: string) =>
    setFavorites((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const saveMemo = (key: string, text: string) => setMemos((prev) => ({ ...prev, [key]: text }));

  // 즐겨찾기한 카드를 위로 (Array.sort는 안정 정렬이라 나머지 순서는 유지)
  const sorted = [...wordHistory].sort(
    (a, b) => Number(favorites.includes(itemKey(b))) - Number(favorites.includes(itemKey(a))),
  );

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

      {/* 구 .word-list */}
      {sorted.length > 0 ? (
        <div className="grid gap-[13px]">
          {sorted.map((item) => {
            const key = itemKey(item);
            return (
              <WordCard
                key={key}
                item={item}
                favorite={favorites.includes(key)}
                memo={memos[key] ?? ''}
                onToggleFavorite={() => toggleFavorite(key)}
                onSaveMemo={(text) => saveMemo(key, text)}
              />
            );
          })}
        </div>
      ) : (
        <p className="mt-5 text-[0.85rem] text-[var(--color-text-faint)]">
          아직 함께 떠올린 단어가 없어요.
        </p>
      )}
    </div>
  );
}
