"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";
import { shuffle } from "@/lib/utils";

type Chip = { id: string; text: string };
type Round = { word: Word; tokens: string[]; bank: Chip[] };

function makeRound(pool: Word[]): Round {
  const word = pool[Math.floor(Math.random() * pool.length)];
  const tokens = (word.example || "").trim().split(/\s+/);
  let bank: Chip[] = tokens.map((t, i) => ({ id: `${i}-${t}-${Math.random()}`, text: t }));
  let tries = 0;
  while (tries < 8 && bank.map((c) => c.text).join(" ") === tokens.join(" ")) {
    bank = shuffle(bank);
    tries++;
  }
  bank = shuffle(bank);
  return { word, tokens, bank };
}

export default function ReorderGame({
  words,
  onReview,
  onClose,
}: {
  words: Word[];
  onReview: (id: string, correct: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const pool = words.filter((w) => w.example && w.example.trim().split(/\s+/).length >= 3);
  const total = Math.min(8, pool.length);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(() => (pool.length >= 1 ? makeRound(pool) : null));
  const [answer, setAnswer] = useState<Chip[]>([]);
  const [status, setStatus] = useState<"playing" | "correct" | "wrong">("playing");
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  if (pool.length < 1) {
    return (
      <Shell onClose={onClose}>
        <div className="flex flex-1 items-center justify-center text-center text-white/60">目前沒有帶例句的單字，先搜尋或學幾個新字吧</div>
      </Shell>
    );
  }
  if (!round) return null;

  const bank = round.bank.filter((c) => !answer.some((a) => a.id === c.id));

  function pick(c: Chip) {
    if (status !== "playing") return;
    const next = [...answer, c];
    setAnswer(next);
    if (next.length === round!.tokens.length) {
      const ok = next.map((x) => x.text).join(" ") === round!.tokens.join(" ");
      if (ok) {
        setStatus("correct");
        setCorrectCount((n) => n + 1);
        onReview(round!.word.id, true);
        setTimeout(advance, 1100);
      } else {
        const a2 = attempts + 1;
        setAttempts(a2);
        if (a2 >= 2) {
          setStatus("wrong");
          onReview(round!.word.id, false);
          setTimeout(advance, 1600);
        } else {
          setStatus("wrong");
          setTimeout(() => { setAnswer([]); setStatus("playing"); }, 700);
        }
      }
    }
  }

  function unpick(c: Chip) {
    if (status !== "playing") return;
    setAnswer(answer.filter((a) => a.id !== c.id));
  }

  function advance() {
    if (roundIdx + 1 >= total) { setDone(true); return; }
    setRoundIdx((i) => i + 1);
    setRound(makeRound(pool));
    setAnswer([]);
    setStatus("playing");
    setAttempts(0);
  }

  if (done) {
    return (
      <Shell onClose={onClose} progress={1}>
        <div className="flex flex-1 flex-col items-center justify-center text-center text-white">
          <div className="text-6xl">{correctCount === total ? "🌟" : "✅"}</div>
          <p className="mt-3 text-4xl font-extrabold">{correctCount} / {total}</p>
          <p className="mt-1 text-white/60">重組正確 {correctCount} 句</p>
          <button onClick={onClose} className="mt-6 rounded-2xl px-8 py-3 font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>完成</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose} progress={roundIdx / total} count={`${roundIdx + 1}/${total}`}>
      <p className="mb-1 text-center text-xs text-white/40">把單字排成正確的英文句子</p>
      <p className="mb-4 text-center text-sm text-white/60">{round.word.exampleZh}</p>

      <div className="mb-4 flex min-h-[64px] flex-wrap content-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        {answer.map((c) => (
          <button
            key={c.id}
            onClick={() => unpick(c)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              status === "correct" ? "bg-green-500/30 text-green-200" : status === "wrong" ? "bg-rose-500/30 text-rose-200" : "bg-white/15 text-white"
            }`}
          >
            {c.text}
          </button>
        ))}
        {answer.length === 0 && <span className="text-xs text-white/30">點下面的單字組成句子…</span>}
      </div>

      {status === "wrong" && attempts < 2 && (
        <p className="mb-2 text-center text-xs text-rose-300">順序不對，再試一次</p>
      )}
      {status === "wrong" && attempts >= 2 && (
        <p className="mb-2 text-center text-xs text-rose-300">正確答案：{round.tokens.join(" ")}</p>
      )}

      <div className="flex flex-1 flex-wrap content-start justify-center gap-2">
        {bank.map((c) => (
          <button key={c.id} onClick={() => pick(c)} className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-800 shadow">
            {c.text}
          </button>
        ))}
      </div>
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-4">{children}</div>
    </div>
  );
}
