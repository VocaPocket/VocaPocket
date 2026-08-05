"use client";

import { useEffect, useState } from "react";

type Word = {
  id: string;
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  createdAt: number;
};

const TYPE_LABEL: Record<string, string> = {
  word: "單字",
  phrase: "片語",
  sentence: "句子",
};

type Result = {
  text: string;
  translation: string;
  type: string;
  source: string;
  target: string;
  saved?: boolean;
  error?: boolean;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  async function loadWords() {
    const r = await fetch("/api/words");
    const d = await r.json();
    setWords(d.items || []);
  }

  useEffect(() => {
    loadWords();
  }, []);

  async function translate() {
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json();
      if (d.error) {
        setResult({ text, translation: "", type: "", source: "", target: "", error: true });
        return;
      }
      const s = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const sd = await s.json();
      setResult({ ...d, saved: sd.saved });
      setQ("");
      loadWords();
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    await fetch(`/api/words/${id}`, { method: "DELETE" });
    loadWords();
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[一-鿿]/.test(text) ? "zh-TW" : "en-US";
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6cf0] text-lg font-bold text-white">
          V
        </div>
        <h1 className="text-xl font-bold text-slate-800">Voca Pocket</h1>
        <span className="ml-auto text-sm text-slate-400">{words.length} 個單字</span>
      </header>

      {/* Translate card */}
      <section className="mb-6">
        <div className="flex items-center justify-between rounded-2xl bg-[#7c6cf0] px-3 py-2.5">
          <span className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-medium text-white">
            自動偵測
          </span>
          <span className="text-white">⇄</span>
          <span className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-medium text-white">
            中 / EN
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") translate();
            }}
            placeholder="翻譯一個單字或句子…"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            autoComplete="off"
          />
          <button
            onClick={translate}
            disabled={loading}
            className="rounded-xl bg-[#7c6cf0] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "翻譯中…" : "翻譯"}
          </button>
        </div>

        {result && !result.error && (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#efeaff] px-2 py-0.5 text-[11px] font-bold text-[#6a5acd]">
                {TYPE_LABEL[result.type] || result.type}
              </span>
              <span className="text-xs text-slate-400">
                {result.source} → {result.target}
              </span>
              <span className="ml-auto text-[11px] font-bold text-green-600">
                {result.saved !== false ? "✓ 已收藏" : "已在庫中"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-lg font-bold text-slate-800">{result.text}</p>
              <button onClick={() => speak(result.text)} className="text-[#7c6cf0]">
                🔊
              </button>
            </div>
            <p className="mt-1 text-slate-600">{result.translation}</p>
          </div>
        )}
        {result?.error && (
          <div className="mt-3 rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">
            翻譯失敗，請稍後再試
          </div>
        )}
      </section>

      {/* Library */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">我的單字庫</h2>
        {words.length === 0 ? (
          <div className="rounded-2xl bg-white/60 p-10 text-center text-sm text-slate-400">
            還沒有單字，翻譯一個字就會自動收進來
          </div>
        ) : (
          <ul className="space-y-2">
            {words.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-800">{w.text}</span>
                    <span className="rounded bg-[#efeaff] px-1.5 py-0.5 text-[10px] font-bold text-[#6a5acd]">
                      {TYPE_LABEL[w.type] || w.type}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-500">{w.translation}</p>
                </div>
                <button onClick={() => speak(w.text)} className="text-slate-300 hover:text-[#7c6cf0]">
                  🔊
                </button>
                <button onClick={() => del(w.id)} className="text-slate-300 hover:text-red-400">
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
