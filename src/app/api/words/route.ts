import { NextRequest, NextResponse } from "next/server";
import { loadWords, saveWords, baseSrsFields, isMastered, Word } from "@/lib/store";

export async function GET() {
  const items = await loadWords();
  items.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const key = (b.text || "").trim().toLowerCase();
  if (!key) return NextResponse.json({ error: "empty" }, { status: 400 });

  const items = await loadWords();
  const existing = items.find(
    (w) => w.text.trim().toLowerCase() === key && w.target === b.target,
  );
  if (existing) {
    return NextResponse.json({ saved: false, reason: "exists", item: existing });
  }

  const word: Word = {
    id: crypto.randomUUID(),
    text: b.text,
    translation: b.translation || "",
    type: b.type || "word",
    source: b.source || "en",
    target: b.target || "zh-TW",
    createdAt: Date.now(),
    origin: "search",
    phonetic: b.phonetic,
    kk: b.kk,
    audio: b.audio,
    pos: b.pos,
    example: b.example,
    exampleZh: b.exampleZh,
    ...baseSrsFields(),
  };
  items.push(word);
  await saveWords(items);
  return NextResponse.json({ saved: true, item: { ...word, mastered: isMastered(word) } });
}
