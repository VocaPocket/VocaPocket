import { NextRequest, NextResponse } from "next/server";
import { loadWords, saveWords, Word } from "@/lib/store";

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
  if (items.some((w) => w.text.trim().toLowerCase() === key && w.target === b.target)) {
    return NextResponse.json({ saved: false, reason: "exists" });
  }

  const word: Word = {
    id: crypto.randomUUID(),
    text: b.text,
    translation: b.translation || "",
    type: b.type || "word",
    source: b.source || "en",
    target: b.target || "zh-TW",
    createdAt: Date.now(),
    reviewCount: 0,
    mastered: false,
  };
  items.push(word);
  await saveWords(items);
  return NextResponse.json({ saved: true, item: word });
}
