"use client";

import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/types";
import { shuffle } from "@/lib/utils";

const FALL_MS = 5000;

type Bubble = { key: string; text: string; correct: boolean; col: number };
type Round = { word: Word; bubbles: Bubble[] };

function speakWord(w: Word) {
  if (w.audio) {
    try { new Audio(w.audio).play(); return; } catch {}
  }
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(w.text);
  u.lang = "en-US";
  u.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function makeRound(pool: Word[], prevId?: string): Round {
  let word = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && word.id === prevId) {
    word = pool[(pool.indexOf(word) + 1) % pool.length];
  }
  const distract = shuffle(pool.filter((w) => w.id !== word.id))
    .slice(0, 3)
    .map((w) => w.translation);
  const cols = shuffle([0, 1, 2, 3]);
  const bubbles: Bubble[] = shuffle([
    { text: word.translation, correct: true },
    ...distract.map((d) => ({ text: d, correct: false })),
  ]).map((b, i) => ({ ...b, key: `${word.id}-${i}-${Math.random()}`, col: cols[i] }));
  return { word, bubbles };
}

export default function FallingGame({
  words,
  onReview,
  onClose,
}: {
  words: Word[];
  onReview: (id: string, correct: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const pool = words.filter((w) => w.translation);
  const total = Math.min(8, pool.length);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(() => (pool.length >= 4 ? makeRound(pool) : null));
  const [roundKey, setRoundKey] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<"hit" | "miss" | null>(null);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!round || done) return;
    speakWord(round.word);
    timeoutRef.current = setTimeout(() => settle(false, null), FALL_MS + 150);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  function settle(hit: boolean, bubbleKey: string | null) {
    if (result || !round) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setResult(hit ? "hit" : "miss");
    if (hit) setCorrect((c) => c + 1);
    onReview(round.word.id, hit);
    void bubbleKey;
    setTimeout(() => {
      if (roundIdx + 1 >= total) {
        setDone(true);
        return;
      }
      const next = makeRound(pool, round.word.id);
      setRoundIdx((i) => i + 1);
      setRound(next);
      setResult(null);
      setRoundKey((k) => k + 1);
    }, 700);
  }

  if (pool.length < 4) {
    return (
      <Shell onClose={onClose}>
        <div className="flex flex-1 items-center justify-center text-center text-white/60">先收集至少 4 個單字才能玩這個遊戲</div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell onClose={onClose} progress={1}>
        <div className="flex flex-1 flex-col items-center justify-center text-center text-white">
          <div className="text-6xl">{correct === total ? "🌟" : "✅"}</div>
          <p className="mt-3 text-4xl font-extrabold">{correct} / {total}</p>
          <p className="mt-1 text-white/60">聽對 {correct} 題</p>
          <button onClick={onClose} className="mt-6 rounded-2xl px-8 py-3 font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>完成</button>
        </div>
      </Shell>
    );
  }

  if (!round) return null;

  return (
    <Shell onClose={onClose} progress={roundIdx / total} count={`${roundIdx + 1}/${total}`}>
      <div className="mb-2 flex items-center justify-center gap-2 text-white/50 text-xs">
        <span>🔊 聽單字，點正確的翻譯泡泡</span>
        <button onClick={() => speakWord(round.word)} className="rounded-full bg-white/10 px-2 py-1">再聽一次</button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {round.bubbles.map((b) => (
          <button
            key={roundKey + b.key}
            onClick={() => settle(b.correct, b.key)}
            disabled={!!result}
            className="falling-bubble absolute w-[46%] rounded-2xl px-3 py-3 text-center text-sm font-semibold shadow-lg"
            style={{
              left: `${b.col * 25 + 2}%`,
              animationDuration: `${FALL_MS}ms`,
              background: result && b.correct ? "rgba(52,211,153,.9)" : "rgba(255,255,255,.92)",
              color: result && b.correct ? "#fff" : "#1e1b4b",
              opacity: result && !b.correct ? 0.35 : 1,
            }}
          >
            {b.text}
          </button>
        ))}
      </div>
      {result && (
        <div className={`mb-2 text-center text-lg font-bold ${result === "hit" ? "text-green-400" : "text-rose-400"}`}>
          {result === "hit" ? "✓ 答對了！" : `✗ 正確答案：${round.word.translation}`}
        </div>
      )}
      <style jsx>{`
        .falling-bubble {
          top: -80px;
          animation-name: vp-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes vp-fall {
          from { top: -80px; }
          to { top: 100%; }
        }
      `}</style>
    </Shell>
  );
}

function Shell({ children, onClose, progress, count }: { children: React.ReactNode; onClose: () => void; progress?: number; count?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col p-5" style={{ background: "radial-gradient(120% 120% at 50% 0%,#1e1b4b,#0f0f1e)" }}>
      <div className="mx-auto flex w-full max-w-md items-center gap-3 pt-2 text-white">
        <button onClick={onClose} className="text-2xl text-white/60">✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all" style={{ width: `${(progress || 0) * 100}%` }} />
        </div>
        {count && <span className="text-xs text-white/50">{count}</span>}
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden pt-3">{children}</div>
    </div>
  );
}
