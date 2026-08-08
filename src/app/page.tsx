"use client";

import { useEffect, useState, useCallback } from "react";

type Word = {
  id: string;
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  origin: "search" | "daily";
  phonetic?: string;
  audio?: string;
  pos?: string;
  example?: string;
  exampleZh?: string;
  reviewCount: number;
  mastered: boolean;
};

type Daily = {
  dailyNewCount: number;
  streak: number;
  todayXp: number;
  totalXp: number;
  counts: { new: number; review: number; mastered: number; learning: number; total: number };
  newToday: Word[];
  review: Word[];
};

const TYPE_LABEL: Record<string, string> = { word: "單字", phrase: "片語", sentence: "句子" };

type Result = { text: string; translation: string; type: string; source: string; target: string; phonetic?: string; audio?: string; pos?: string; example?: string; exampleZh?: string; saved?: boolean; error?: boolean };

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [daily, setDaily] = useState<Daily | null>(null);

  // review session
  const [queue, setQueue] = useState<Word[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [view, setView] = useState<"home" | "daily">("home");

  const loadAll = useCallback(async () => {
    const [w, d] = await Promise.all([
      fetch("/api/words").then((r) => r.json()),
      fetch("/api/daily").then((r) => r.json()),
    ]);
    setWords(w.items || []);
    setDaily(d);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function speak(text: string, audio?: string) {
    if (audio) {
      try {
        new Audio(audio).play();
        return;
      } catch {}
    }
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[一-鿿]/.test(text) ? "zh-TW" : "en-US";
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function translate() {
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const d = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (d.error) {
        setResult({ text, translation: "", type: "", source: "", target: "", error: true });
        return;
      }
      const sd = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      }).then((r) => r.json());
      setResult({ ...d, saved: sd.saved });
      setQ("");
      loadAll();
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    await fetch(`/api/words/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function setDailyCount(n: number) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyNewCount: n }),
    });
    loadAll();
  }

  function startReview() {
    if (!daily) return;
    const pool = [...daily.newToday, ...daily.review];
    if (!pool.length) return;
    setQueue(pool);
    setIdx(0);
    setFlipped(false);
    setKnown(0);
  }

  function startDailyLearn() {
    if (!daily || !daily.newToday.length) return;
    setQueue(daily.newToday);
    setIdx(0);
    setFlipped(false);
    setKnown(0);
  }

  async function grade(correct: boolean) {
    if (!queue) return;
    if (correct) setKnown((k) => k + 1);
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: queue[idx].id, correct }),
    });
    if (idx + 1 >= queue.length) {
      setQueue(null);
      loadAll();
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  function masteryBadge(w: Word) {
    if (w.mastered)
      return <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">已學會</span>;
    if (w.reviewCount > 0)
      return <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">複習中</span>;
    return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">未複習</span>;
  }

  const cur = queue ? queue[idx] : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6cf0] text-lg font-bold text-white">V</div>
        <h1 className="text-xl font-bold text-slate-800">Voca Pocket</h1>
        <span className="ml-auto flex items-center gap-3 text-sm">
          <span className="font-bold text-orange-500">🔥 {daily?.streak ?? 0}</span>
          <span className="font-bold text-amber-500">⭐ {daily?.totalXp ?? 0}</span>
        </span>
      </header>

      {/* Tab switch */}
      <div className="mb-4 flex gap-1 rounded-xl bg-white/60 p-1 text-sm font-semibold">
        <button onClick={() => setView("home")} className={`flex-1 rounded-lg py-2 ${view === "home" ? "bg-white text-[#7c6cf0] shadow-sm" : "text-slate-400"}`}>翻譯 / 複習</button>
        <button onClick={() => setView("daily")} className={`flex-1 rounded-lg py-2 ${view === "daily" ? "bg-white text-[#7c6cf0] shadow-sm" : "text-slate-400"}`}>每日單字</button>
      </div>

      {/* Daily words page */}
      {view === "daily" && daily && (
        <section>
          <div className="mb-1">
            <h2 className="text-lg font-bold text-slate-800">每日單字</h2>
            <p className="text-xs text-slate-400">每天更新 {daily.dailyNewCount} 個新單字，和你搜尋的字分開。</p>
          </div>
          <div className="my-3 flex items-center gap-2 text-xs">
            <span className="text-slate-500">每日數量</span>
            {[3, 5, 7, 10].map((n) => (
              <button key={n} onClick={() => setDailyCount(n)} className={`rounded-lg px-2.5 py-1 font-semibold ${daily.dailyNewCount === n ? "bg-[#7c6cf0] text-white" : "bg-white text-slate-500"}`}>{n}</button>
            ))}
          </div>
          <button onClick={startDailyLearn} disabled={!daily.newToday.length} className="mb-4 w-full rounded-xl bg-[#7c6cf0] py-3 font-bold text-white disabled:opacity-60">
            {daily.newToday.length ? `▶ 開始學習今日 ${daily.newToday.length} 個新字` : "今天的新字都學過了 🎉"}
          </button>
          <ul className="space-y-2">
            {daily.newToday.map((w) => (
              <li key={w.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{w.text}</span>
                  {w.pos && <span className="text-xs text-slate-400">{w.pos}</span>}
                  <button onClick={() => speak(w.text, w.audio)} className="text-[#7c6cf0]">🔊</button>
                  <span className="ml-auto">{masteryBadge(w)}</span>
                </div>
                <p className="text-sm text-slate-600">{w.translation}</p>
                {w.example && (
                  <p className="mt-1 border-l-2 border-[#efeaff] pl-2 text-xs text-slate-500">
                    {w.example}
                    {w.exampleZh && <><br /><span className="text-slate-400">{w.exampleZh}</span></>}
                  </p>
                )}
              </li>
            ))}
            {daily.newToday.length === 0 && (
              <li className="rounded-2xl bg-white/60 p-8 text-center text-sm text-slate-400">今天的新字都學完了，明天再來 🎉</li>
            )}
          </ul>
        </section>
      )}

      {view === "home" && (
      <>
      {/* Translate */}
      <section className="mb-5">
        <div className="flex items-center justify-between rounded-2xl bg-[#7c6cf0] px-3 py-2.5">
          <span className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-medium text-white">自動偵測</span>
          <span className="text-white">⇄</span>
          <span className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-medium text-white">中 / EN</span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && translate()}
            placeholder="翻譯一個單字或句子…"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            autoComplete="off"
          />
          <button onClick={translate} disabled={loading} className="rounded-xl bg-[#7c6cf0] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "翻譯中…" : "翻譯"}
          </button>
        </div>
        {result && !result.error && (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#efeaff] px-2 py-0.5 text-[11px] font-bold text-[#6a5acd]">{TYPE_LABEL[result.type] || result.type}</span>
              <span className="text-xs text-slate-400">{result.source} → {result.target}</span>
              <span className="ml-auto text-[11px] font-bold text-green-600">{result.saved !== false ? "✓ 已收藏" : "已在庫中"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-lg font-bold text-slate-800">{result.text}</p>
              {result.pos && <span className="text-xs text-slate-400">{result.pos}</span>}
              <button onClick={() => speak(result.text, result.audio)} className="text-[#7c6cf0]">🔊</button>
            </div>
            {result.phonetic && <p className="text-xs text-slate-400">{result.phonetic}</p>}
            <p className="mt-1 text-slate-600">{result.translation}</p>
            {result.example && (
              <p className="mt-2 border-l-2 border-[#efeaff] pl-2 text-sm text-slate-500">
                {result.example}
                {result.exampleZh && <><br /><span className="text-slate-400">{result.exampleZh}</span></>}
              </p>
            )}
          </div>
        )}
        {result?.error && <div className="mt-3 rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">翻譯失敗，請稍後再試</div>}
      </section>

      {/* Today's learning */}
      <section className="mb-5 rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#7c6cf0,#6a5acd)" }}>
        <p className="text-sm opacity-90">今日複習</p>
        <div className="mt-1 flex items-end gap-5">
          <div><span className="text-4xl font-extrabold">{daily?.counts.new ?? 0}</span><span className="text-sm opacity-80"> 新字</span></div>
          <div><span className="text-4xl font-extrabold">{daily?.counts.review ?? 0}</span><span className="text-sm opacity-80"> 待複習</span></div>
          <div className="ml-auto text-right text-xs opacity-80">已學會 {daily?.counts.mastered ?? 0}<br />複習中 {daily?.counts.learning ?? 0}</div>
        </div>
        <p className="mt-2 text-xs opacity-80">新字來自每日單字庫，待複習包含你搜尋過的字。答對率越高越快「學會」。</p>
        <button
          onClick={startReview}
          disabled={!daily || daily.counts.new + daily.counts.review === 0}
          className="mt-3 w-full rounded-xl bg-white py-3 font-bold text-indigo-600 disabled:opacity-60"
        >
          {daily && daily.counts.new + daily.counts.review === 0 ? "今天都複習完了 🎉" : "▶ 開始今日複習"}
        </button>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="opacity-90">每日新字</span>
          {[3, 5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setDailyCount(n)}
              className={`rounded-lg px-2.5 py-1 font-semibold ${daily?.dailyNewCount === n ? "bg-white text-indigo-600" : "bg-white/20 text-white"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* Library */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">我的單字庫（{words.length}）</h2>
        {words.length === 0 ? (
          <div className="rounded-2xl bg-white/60 p-10 text-center text-sm text-slate-400">還沒有單字，翻譯一個字就會自動收進來</div>
        ) : (
          <ul className="space-y-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-800">{w.text}</span>
                    {w.origin === "daily" && <span className="rounded bg-[#efeaff] px-1.5 py-0.5 text-[10px] font-bold text-[#6a5acd]">每日</span>}
                    {masteryBadge(w)}
                  </div>
                  <p className="truncate text-sm text-slate-500">{w.translation}</p>
                </div>
                <button onClick={() => speak(w.text, w.audio)} className="text-slate-300 hover:text-[#7c6cf0]">🔊</button>
                <button onClick={() => del(w.id)} className="text-slate-300 hover:text-red-400">🗑</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
      )}

      {/* Review overlay */}
      {cur && (
        <div className="fixed inset-0 z-50 flex flex-col p-5" style={{ background: "radial-gradient(120% 120% at 50% 0%,#1e1b4b,#0f0f1e)" }}>
          <div className="mx-auto flex w-full max-w-md items-center gap-3 pt-2 text-white">
            <button onClick={() => { setQueue(null); loadAll(); }} className="text-2xl text-white/60">✕</button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all" style={{ width: `${(idx / queue!.length) * 100}%` }} />
            </div>
            <span className="text-xs text-white/50">{idx + 1}/{queue!.length}</span>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
            <div className="mb-2 flex gap-2">
              {cur.origin === "daily" && <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-indigo-200">每日新字</span>}
              {cur.pos && <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-indigo-200">{cur.pos}</span>}
            </div>
            <p className="text-4xl font-extrabold text-white">{cur.text}</p>
            {cur.phonetic && <p className="mt-1 text-sm text-white/50">{cur.phonetic}</p>}
            <button onClick={() => speak(cur.text, cur.audio)} className="mt-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">🔊</button>
            {flipped ? (
              <div className="mt-5">
                <p className="text-2xl font-extrabold text-amber-400">{cur.translation}</p>
                {cur.example && <p className="mt-3 max-w-xs text-sm italic text-white/70">&ldquo;{cur.example}&rdquo;<br /><span className="not-italic text-white/40">{cur.exampleZh}</span></p>}
              </div>
            ) : (
              <p className="mt-5 text-sm text-white/40">想一下意思，點下方看答案</p>
            )}
          </div>

          <div className="mx-auto w-full max-w-md pb-4">
            {flipped ? (
              <div className="flex gap-3">
                <button onClick={() => grade(false)} className="flex-1 rounded-2xl border border-rose-400/30 bg-rose-500/15 py-4 font-bold text-rose-300">↻ 還不熟</button>
                <button onClick={() => grade(true)} className="flex-1 rounded-2xl py-4 font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>✓ 記得了</button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)} className="w-full rounded-2xl bg-white/10 py-4 font-semibold text-white">看答案</button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
